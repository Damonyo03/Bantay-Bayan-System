import { supabase } from '../lib/supabaseClient';
import { OperationalReminder, SystemAlertSetting } from '../types';

export const DEFAULT_ALERT_SETTINGS: Record<string, { label: string; value: number; unit: string }> = {
  cctv_retention_warning_days: {
    label: 'CCTV Footage Retention Warning',
    value: 7,
    unit: 'days',
  },
  vehicle_trip_timeout_hours: {
    label: 'Vehicle Trip Update Timeout',
    value: 4,
    unit: 'hours',
  },
  blotter_inactive_days: {
    label: 'Inactive Blotter Case Threshold',
    value: 7,
    unit: 'days',
  },
};

export const reminderService = {
  /**
   * Fetch configured thresholds from system_alert_settings
   */
  getAlertSettings: async (): Promise<SystemAlertSetting[]> => {
    try {
      const { data, error } = await supabase
        .from('system_alert_settings')
        .select('*')
        .order('key', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as SystemAlertSetting[];
      }
    } catch (err) {
      console.warn('Failed to load system_alert_settings from DB, using defaults:', err);
    }

    // Fallback to default in-memory settings
    return Object.entries(DEFAULT_ALERT_SETTINGS).map(([key, def]) => ({
      id: key,
      key,
      label: def.label,
      value_numeric: def.value,
      unit: def.unit,
      description: '',
      updated_at: new Date().toISOString(),
    }));
  },

  /**
   * Update an alert threshold setting (admin only)
   */
  updateAlertSetting: async (key: string, value: number): Promise<void> => {
    const { data: authData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('system_alert_settings')
      .update({
        value_numeric: value,
        updated_at: new Date().toISOString(),
        updated_by: authData?.user?.id || null,
      })
      .eq('key', key);

    if (error) throw error;
  },

  /**
   * Compute active operational reminders based on real-time database state
   */
  getOperationalReminders: async (): Promise<OperationalReminder[]> => {
    const settings = await reminderService.getAlertSettings();
    const settingsMap = new Map(settings.map((s) => [s.key, s.value_numeric]));

    const cctvThresholdDays = settingsMap.get('cctv_retention_warning_days') ?? 7;
    const vehicleTimeoutHours = settingsMap.get('vehicle_trip_timeout_hours') ?? 4;
    const blotterInactiveDays = settingsMap.get('blotter_inactive_days') ?? 7;

    const now = new Date();
    const reminders: OperationalReminder[] = [];

    // 1. Check CCTV requests approaching retention limit or pending too long
    try {
      const { data: cctvRequests } = await supabase
        .from('cctv_requests')
        .select('id, request_number, requester_name, incident_type, incident_date, status, created_at')
        .in('status', ['pending', 'in_review'])
        .order('created_at', { ascending: true })
        .limit(20);

      (cctvRequests || []).forEach((cctv) => {
        const createdDate = new Date(cctv.created_at);
        const ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));

        if (ageInDays >= cctvThresholdDays) {
          reminders.push({
            id: `cctv_${cctv.id}`,
            category: 'cctv',
            severity: ageInDays >= 14 ? 'urgent' : 'warning',
            title: `CCTV Request Pending for ${ageInDays} Days`,
            description: `Request #${cctv.request_number || cctv.id.slice(0, 6)} for ${cctv.requester_name} (${cctv.incident_type}) is pending review. Surveillance camera storage may soon overwrite footage.`,
            record_id: cctv.request_number || cctv.id,
            url_path: '/download-forms',
            created_at: cctv.created_at,
          });
        }
      });
    } catch (err) {
      console.warn('Reminder check failed for CCTV:', err);
    }

    // 2. Check vehicles on trip for too long without update
    try {
      const { data: ongoingTrips } = await supabase
        .from('vehicle_trips')
        .select(`
          id,
          driver_name,
          purpose,
          started_at,
          created_at,
          vehicle:vehicles (name, plate_number),
          stops:trip_stops (place, arrival_time, departure_time, created_at)
        `)
        .eq('status', 'ongoing');

      (ongoingTrips || []).forEach((trip: any) => {
        const startTime = new Date(trip.started_at || trip.created_at).getTime();
        // Check latest waypoint stop time
        const sortedStops = (trip.stops || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastActivityTime =
          sortedStops.length > 0
            ? new Date(sortedStops[0].departure_time || sortedStops[0].arrival_time || sortedStops[0].created_at).getTime()
            : startTime;

        const hoursElapsed = (now.getTime() - lastActivityTime) / (1000 * 3600);

        if (hoursElapsed >= vehicleTimeoutHours) {
          const hoursInt = Math.floor(hoursElapsed);
          const vehicleName = trip.vehicle?.name || 'Patrol Unit';
          reminders.push({
            id: `trip_${trip.id}`,
            category: 'vehicle',
            severity: hoursElapsed >= 8 ? 'urgent' : 'warning',
            title: `${vehicleName} on Trip Without Update (${hoursInt}h)`,
            description: `Driver ${trip.driver_name} on mission "${trip.purpose}" has had no arrival/departure waypoint logged for over ${hoursInt} hours.`,
            record_id: trip.id,
            url_path: '/vehicles',
            created_at: trip.started_at || trip.created_at,
          });
        }
      });
    } catch (err) {
      console.warn('Reminder check failed for Vehicles:', err);
    }

    // 3. Check Blotters with no status updates for N days
    try {
      const cutoffDate = new Date(now.getTime() - blotterInactiveDays * 24 * 3600 * 1000).toISOString();
      const { data: inactiveBlotters } = await supabase
        .from('incidents')
        .select('id, case_number, type, location, officer_name, status, created_at, updated_at')
        .in('status', ['Pending', 'Dispatched'])
        .lte('created_at', cutoffDate)
        .order('created_at', { ascending: true })
        .limit(20);

      (inactiveBlotters || []).forEach((inc) => {
        const createdDate = new Date(inc.created_at);
        const daysOpen = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));

        reminders.push({
          id: `blotter_${inc.id}`,
          category: 'blotter',
          severity: daysOpen >= 14 ? 'urgent' : 'warning',
          title: `Blotter Case ${inc.case_number} Open for ${daysOpen} Days`,
          description: `Case "${inc.type}" at ${inc.location || 'Barangay'} assigned to Officer ${inc.officer_name || 'Unassigned'} has had no recorded resolution or status update.`,
          record_id: inc.case_number || inc.id,
          url_path: '/dashboard',
          created_at: inc.created_at,
        });
      });
    } catch (err) {
      console.warn('Reminder check failed for Blotters:', err);
    }

    // Sort: Urgent first, then newest
    return reminders.sort((a, b) => {
      if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
      if (b.severity === 'urgent' && a.severity !== 'urgent') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },
};
