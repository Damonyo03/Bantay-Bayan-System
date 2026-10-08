import { supabase } from '../lib/supabaseClient';
import { GlobalSearchResult, GroupedSearchResults } from '../types';

export const searchService = {
  /**
   * Execute global search across blotters, logbook, CCTV, and vehicles.
   * Uses read-only SQL RPC with SECURITY INVOKER to strictly preserve RLS.
   */
  search: async (query: string, limit = 30): Promise<GroupedSearchResults> => {
    const clean = query.trim();
    if (!clean) {
      return {
        blotters: [],
        logbook: [],
        cctv: [],
        vehicles: [],
        totalCount: 0,
      };
    }

    try {
      // 1. Primary: Try SQL RPC global_search
      const { data, error } = await supabase.rpc('global_search', {
        p_query: clean,
        p_limit: limit,
      });

      if (!error && Array.isArray(data)) {
        return groupResults(data as GlobalSearchResult[]);
      }

      // 2. Fallback: Query tables directly with Supabase client (preserving RLS)
      return await fallbackSearch(clean, limit);
    } catch (err) {
      console.warn('RPC global_search fallback triggered:', err);
      return await fallbackSearch(clean, limit);
    }
  },
};

const groupResults = (items: GlobalSearchResult[]): GroupedSearchResults => {
  const blotters = items.filter((i) => i.type === 'blotter');
  const logbook = items.filter((i) => i.type === 'logbook');
  const cctv = items.filter((i) => i.type === 'cctv_request');
  const vehicles = items.filter((i) => i.type === 'vehicle' || i.type === 'vehicle_trip');

  return {
    blotters,
    logbook,
    cctv,
    vehicles,
    totalCount: items.length,
  };
};

/**
 * Client-side fallback if RPC is pending in database migration
 */
const fallbackSearch = async (clean: string, limit: number): Promise<GroupedSearchResults> => {
  const pattern = `%${clean}%`;

  const [incidentsRes, logbookRes, cctvRes, vehiclesRes] = await Promise.allSettled([
    supabase
      .from('incidents')
      .select('id, case_number, type, location, officer_name, narrative, status, created_at')
      .or(`case_number.ilike.${pattern},type.ilike.${pattern},narrative.ilike.${pattern},location.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('logbook_entries')
      .select('id, title, description, category, action, reporter_name, created_at')
      .or(`title.ilike.${pattern},description.ilike.${pattern},reporter_name.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('cctv_requests')
      .select('id, request_number, requester_name, incident_type, purpose, location, status, created_at')
      .or(`request_number.ilike.${pattern},requester_name.ilike.${pattern},incident_type.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('vehicles')
      .select('id, name, plate_number, status, created_at')
      .or(`name.ilike.${pattern},plate_number.ilike.${pattern}`)
      .limit(limit),
  ]);

  const results: GlobalSearchResult[] = [];

  if (incidentsRes.status === 'fulfilled' && incidentsRes.value.data) {
    incidentsRes.value.data.forEach((i: any) => {
      results.push({
        id: String(i.id),
        type: 'blotter',
        title: `${i.case_number || 'Blotter Case'} — ${i.type || 'Incident'}`,
        subtitle: `Location: ${i.location || 'N/A'} | Officer: ${i.officer_name || 'N/A'}`,
        details: i.narrative,
        status: i.status,
        created_at: i.created_at,
        url_path: '/dashboard',
      });
    });
  }

  if (logbookRes.status === 'fulfilled' && logbookRes.value.data) {
    logbookRes.value.data.forEach((l: any) => {
      results.push({
        id: String(l.id),
        type: 'logbook',
        title: l.title,
        subtitle: `Category: ${l.category} | By: ${l.reporter_name || 'System'}`,
        details: l.description,
        status: l.action,
        created_at: l.created_at,
        url_path: '/logbook',
      });
    });
  }

  if (cctvRes.status === 'fulfilled' && cctvRes.value.data) {
    cctvRes.value.data.forEach((c: any) => {
      results.push({
        id: String(c.id),
        type: 'cctv_request',
        title: `CCTV Request #${c.request_number || c.id}`,
        subtitle: `Requester: ${c.requester_name || 'N/A'} | Case: ${c.incident_type || 'N/A'}`,
        details: c.purpose,
        status: c.status,
        created_at: c.created_at,
        url_path: '/download-forms',
      });
    });
  }

  if (vehiclesRes.status === 'fulfilled' && vehiclesRes.value.data) {
    vehiclesRes.value.data.forEach((v: any) => {
      results.push({
        id: String(v.id),
        type: 'vehicle',
        title: `${v.name} (${v.plate_number})`,
        subtitle: `Status: ${v.status}`,
        details: 'Barangay Patrol / Fleet Unit',
        status: v.status,
        created_at: v.created_at,
        url_path: '/vehicles',
      });
    });
  }

  return groupResults(results);
};
