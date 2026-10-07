import { supabase } from '../lib/supabaseClient';
import { Vehicle, VehicleTrip, TripStop, TripPassenger } from '../types';

export interface StartTripParams {
  vehicle_id: string;
  driver_id?: string | null;
  driver_name: string;
  purpose: string;
  odometer_start?: number | null;
  initial_destination?: string;
  passengers?: { person_id?: string | null; name: string }[];
}

export const vehicleService = {
  /**
   * Fetch all vehicles with their active/ongoing trip details (if any)
   */
  getVehiclesWithLiveTrips: async (): Promise<Vehicle[]> => {
    // 1. Fetch vehicles
    const { data: vehiclesData, error: vError } = await supabase
      .from('vehicles')
      .select('*')
      .order('name', { ascending: true });

    if (vError) throw vError;

    // 2. Fetch all ongoing trips with stops & passengers
    const { data: ongoingTrips, error: tError } = await supabase
      .from('vehicle_trips')
      .select(`
        *,
        stops:trip_stops (*),
        passengers:trip_passengers (*)
      `)
      .eq('status', 'ongoing');

    if (tError) throw tError;

    const tripMap = new Map<string, VehicleTrip>();
    (ongoingTrips || []).forEach((t: any) => {
      // Sort stops by created_at ascending
      const sortedStops = (t.stops || []).sort(
        (a: TripStop, b: TripStop) =>
          new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
      );
      tripMap.set(t.vehicle_id, {
        ...t,
        stops: sortedStops,
        passengers: t.passengers || [],
      });
    });

    return (vehiclesData || []).map((v: any) => ({
      ...v,
      active_trip: tripMap.get(v.id) || null,
    })) as Vehicle[];
  },

  /**
   * Start a new ongoing trip for a vehicle
   */
  startTrip: async (params: StartTripParams): Promise<string> => {
    const { data: userData } = await supabase.auth.getUser();

    // 1. Insert vehicle_trip
    const { data: trip, error: tripError } = await supabase
      .from('vehicle_trips')
      .insert({
        vehicle_id: params.vehicle_id,
        driver_id: params.driver_id || null,
        driver_name: params.driver_name.trim(),
        purpose: params.purpose.trim(),
        status: 'ongoing',
        odometer_start: params.odometer_start || null,
        logged_by: userData?.user?.id || null,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (tripError) throw tripError;

    const tripId = trip.id;

    // 2. Insert passengers (if any)
    if (params.passengers && params.passengers.length > 0) {
      const passengerRows = params.passengers
        .filter((p) => p.name.trim() !== '')
        .map((p) => ({
          trip_id: tripId,
          person_id: p.person_id || null,
          passenger_name: p.name.trim(),
        }));

      if (passengerRows.length > 0) {
        const { error: pError } = await supabase.from('trip_passengers').insert(passengerRows);
        if (pError) console.warn('Failed to insert passengers:', pError);
      }
    }

    // 3. Insert initial destination stop (if provided)
    if (params.initial_destination && params.initial_destination.trim() !== '') {
      const { error: stopError } = await supabase.from('trip_stops').insert({
        trip_id: tripId,
        place: params.initial_destination.trim(),
        departure_time: new Date().toISOString(), // Initial departure from base
      });
      if (stopError) console.warn('Failed to insert initial stop:', stopError);
    }

    return tripId;
  },

  /**
   * Record arrival at a destination stop
   */
  recordArrival: async (
    trip_id: string,
    place: string,
    manual_time?: string | null,
    manual_reason?: string | null
  ): Promise<void> => {
    const arrivalTime = manual_time
      ? new Date(manual_time).toISOString()
      : new Date().toISOString();

    const { error } = await supabase.from('trip_stops').insert({
      trip_id,
      place: place.trim(),
      arrival_time: arrivalTime,
      manual_time_reason: manual_reason ? manual_reason.trim() : null,
    });

    if (error) throw error;
  },

  /**
   * Record departure from an existing stop
   */
  recordDeparture: async (
    stop_id: string,
    manual_time?: string | null,
    manual_reason?: string | null
  ): Promise<void> => {
    const departureTime = manual_time
      ? new Date(manual_time).toISOString()
      : new Date().toISOString();

    const updatePayload: any = {
      departure_time: departureTime,
    };

    if (manual_reason && manual_reason.trim() !== '') {
      updatePayload.manual_time_reason = manual_reason.trim();
    }

    const { error } = await supabase
      .from('trip_stops')
      .update(updatePayload)
      .eq('id', stop_id);

    if (error) throw error;
  },

  /**
   * End / complete an active trip
   */
  endTrip: async (
    trip_id: string,
    odometer_end?: number | null,
    remarks?: string | null
  ): Promise<void> => {
    const { error } = await supabase
      .from('vehicle_trips')
      .update({
        status: 'completed',
        odometer_end: odometer_end || null,
        remarks: remarks ? remarks.trim() : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', trip_id);

    if (error) throw error;
  },

  /**
   * Set vehicle maintenance or decommissioned status
   */
  updateVehicleStatus: async (
    vehicle_id: string,
    status: 'available' | 'maintenance' | 'decommissioned'
  ): Promise<void> => {
    const { error } = await supabase
      .from('vehicles')
      .update({ status })
      .eq('id', vehicle_id);

    if (error) throw error;
  },

  /**
   * Fetch trip history with filtering
   */
  getTripHistory: async (filters?: {
    vehicle_id?: string;
    driver_name?: string;
    date_start?: string;
    date_end?: string;
    status?: string;
  }): Promise<VehicleTrip[]> => {
    let query = supabase
      .from('vehicle_trips')
      .select(`
        *,
        vehicle:vehicles (*),
        stops:trip_stops (*),
        passengers:trip_passengers (*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.vehicle_id && filters.vehicle_id !== 'All') {
      query = query.eq('vehicle_id', filters.vehicle_id);
    }

    if (filters?.status && filters.status !== 'All') {
      query = query.eq('status', filters.status);
    }

    if (filters?.date_start) {
      query = query.gte('created_at', new Date(`${filters.date_start}T00:00:00`).toISOString());
    }

    if (filters?.date_end) {
      query = query.lte('created_at', new Date(`${filters.date_end}T23:59:59.999`).toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    let trips = (data as VehicleTrip[]) || [];

    if (filters?.driver_name && filters.driver_name.trim() !== '') {
      const d = filters.driver_name.toLowerCase().trim();
      trips = trips.filter(
        (t) =>
          t.driver_name.toLowerCase().includes(d) ||
          t.purpose.toLowerCase().includes(d) ||
          t.vehicle?.name.toLowerCase().includes(d) ||
          t.vehicle?.plate_number.toLowerCase().includes(d)
      );
    }

    return trips;
  },

  /**
   * Subscribe to realtime updates for vehicles, trips, and stops
   */
  subscribeToVehicleMonitor: (onUpdate: () => void) => {
    const channelId = `vehicle_monitor_${Math.random().toString(36).substring(2, 9)}`;
    return supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_trips' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_stops' }, onUpdate)
      .subscribe();
  },

  unsubscribe: (channel: any) => {
    supabase.removeChannel(channel);
  },
};
