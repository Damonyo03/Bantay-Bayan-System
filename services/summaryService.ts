import { supabase } from '../lib/supabaseClient';
import { DailySummaryData } from '../types';

export const summaryService = {
  /**
   * Fetch today's operational metrics and pending items
   */
  getDailySummary: async (targetDate?: string): Promise<DailySummaryData> => {
    const today = targetDate || new Date().toISOString().slice(0, 10);
    const startIso = new Date(`${today}T00:00:00`).toISOString();
    const endIso = new Date(`${today}T23:59:59.999`).toISOString();

    const [
      todayIncidents,
      todayCctv,
      todayTrips,
      todayLogbook,
      pendingIncidents,
      pendingCctv,
      ongoingTrips,
      pendingReports,
      pendingHandovers,
    ] = await Promise.allSettled([
      // 1. Today's Blotters
      supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lte('created_at', endIso),

      // 2. Today's CCTV Requests
      supabase
        .from('cctv_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lte('created_at', endIso),

      // 3. Today's Vehicle Trips
      supabase
        .from('vehicle_trips')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lte('created_at', endIso),

      // 4. Today's Logbook Entries
      supabase
        .from('logbook_entries')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lte('created_at', endIso),

      // 5. Total Pending / Active Blotters
      supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Pending', 'Dispatched']),

      // 6. Total Pending CCTV
      supabase
        .from('cctv_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // 7. Total Ongoing Vehicle Trips
      supabase
        .from('vehicle_trips')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ongoing'),

      // 8. Total Pending Public Reports
      supabase
        .from('public_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending Review'),

      // 9. Total Unacknowledged Shift Handovers
      supabase
        .from('shift_handovers')
        .select('*', { count: 'exact', head: true })
        .is('acknowledged_at', null),
    ]);

    const getCount = (res: PromiseSettledResult<any>) =>
      res.status === 'fulfilled' && res.value && typeof res.value.count === 'number'
        ? res.value.count
        : 0;

    return {
      date: today,
      today_counts: {
        blotters: getCount(todayIncidents),
        cctv_requests: getCount(todayCctv),
        vehicle_trips: getCount(todayTrips),
        logbook_entries: getCount(todayLogbook),
      },
      pending_items: {
        pending_blotters: getCount(pendingIncidents),
        pending_cctv: getCount(pendingCctv),
        ongoing_trips: getCount(ongoingTrips),
        pending_reports: getCount(pendingReports),
        pending_handovers: getCount(pendingHandovers),
      },
    };
  },
};
