import { supabase } from '../lib/supabaseClient';
import { LogbookEntry, LogEventParams, LogbookCategory } from '../types';

export const logbookService = {
  /**
   * Fetch logbook entries for a specific day (local timezone date: YYYY-MM-DD)
   */
  getEntriesByDate: async (
    dateStr: string,
    filters?: {
      category?: LogbookCategory | 'All';
      reporter?: string;
      query?: string;
    }
  ): Promise<LogbookEntry[]> => {
    // Construct local midnight to end-of-day UTC range
    const startOfDay = new Date(`${dateStr}T00:00:00`).toISOString();
    const endOfDay = new Date(`${dateStr}T23:59:59.999`).toISOString();

    let query = supabase
      .from('logbook_entries')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });

    if (filters?.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
    }

    if (filters?.reporter && filters.reporter !== 'All') {
      query = query.eq('reported_by', filters.reporter);
    }

    const { data, error } = await query;
    if (error) throw error;

    let entries = (data as LogbookEntry[]) || [];

    // Client-side text search across title, description, reporter_name, reference_id
    if (filters?.query && filters.query.trim() !== '') {
      const q = filters.query.toLowerCase().trim();
      entries = entries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q) ||
          entry.reporter_name.toLowerCase().includes(q) ||
          (entry.reference_id && entry.reference_id.toLowerCase().includes(q))
      );
    }

    return entries;
  },

  /**
   * Log an event via the secure server-side RPC function
   */
  logEvent: async (params: LogEventParams): Promise<string> => {
    const { data, error } = await supabase.rpc('log_event', {
      p_category: params.category,
      p_action: params.action,
      p_title: params.title,
      p_description: params.description,
      p_reference_type: params.reference_type || null,
      p_reference_id: params.reference_id || null,
      p_metadata: params.metadata || {},
      p_corrects_entry_id: params.corrects_entry_id || null,
    });

    if (error) {
      // Fallback: If RPC not yet installed or permission issue, insert directly if allowed by RLS
      console.warn('RPC log_event failed, attempting direct table insert fallback:', error.message);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', userData.user.id)
        .single();

      const { data: insertData, error: insertError } = await supabase
        .from('logbook_entries')
        .insert({
          reported_by: userData.user.id,
          reporter_name: profile?.full_name || 'Staff Member',
          reporter_role: profile?.role || 'bantay_bayan',
          category: params.category,
          action: params.action,
          title: params.title,
          description: params.description,
          reference_type: params.reference_type || null,
          reference_id: params.reference_id || null,
          metadata: params.metadata || {},
          corrects_entry_id: params.corrects_entry_id || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      return insertData.id;
    }

    return data as string;
  },

  /**
   * Create an immutable correction entry referencing the original entry
   */
  addCorrection: async (
    originalEntry: LogbookEntry,
    correctionTitle: string,
    correctionDescription: string
  ): Promise<string> => {
    return await logbookService.logEvent({
      category: 'correction',
      action: 'ADD_CORRECTION',
      title: correctionTitle || `Correction to: ${originalEntry.title}`,
      description: correctionDescription,
      reference_type: originalEntry.reference_type || 'logbook_entry',
      reference_id: originalEntry.reference_id || originalEntry.id,
      metadata: {
        original_entry_id: originalEntry.id,
        original_title: originalEntry.title,
        original_category: originalEntry.category,
        original_time: originalEntry.created_at,
      },
      corrects_entry_id: originalEntry.id,
    });
  },

  /**
   * Realtime subscription for logbook entry updates
   */
  subscribeToLogbook: (onNewEntry: (entry: LogbookEntry) => void) => {
    const channelId = `logbook_live_${Math.random().toString(36).substring(2, 9)}`;
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'logbook_entries',
        },
        (payload) => {
          onNewEntry(payload.new as LogbookEntry);
        }
      )
      .subscribe();
  },

  unsubscribe: (channel: any) => {
    supabase.removeChannel(channel);
  },
};
