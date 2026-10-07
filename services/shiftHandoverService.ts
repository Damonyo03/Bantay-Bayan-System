import { supabase } from '../lib/supabaseClient';
import { ShiftHandover } from '../types';

export interface CreateHandoverParams {
  shift_name: string;
  outgoing_name: string;
  incoming_name?: string | null;
  notes: string;
  pending_items?: string | null;
}

export const shiftHandoverService = {
  /**
   * Fetch list of shift handovers, most recent first
   */
  getHandovers: async (limit = 50): Promise<ShiftHandover[]> => {
    const { data, error } = await supabase
      .from('shift_handovers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as ShiftHandover[]) || [];
  },

  /**
   * Create a new shift handover record (outgoing officer)
   */
  createHandover: async (params: CreateHandoverParams): Promise<ShiftHandover> => {
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('shift_handovers')
      .insert({
        outgoing_user: userData?.user?.id || null,
        outgoing_name: params.outgoing_name.trim(),
        incoming_name: params.incoming_name ? params.incoming_name.trim() : null,
        shift_name: params.shift_name.trim(),
        notes: params.notes.trim(),
        pending_items: params.pending_items ? params.pending_items.trim() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ShiftHandover;
  },

  /**
   * Acknowledge an existing shift handover record (incoming officer)
   */
  acknowledgeHandover: async (
    handoverId: string,
    acknowledgedByName: string
  ): Promise<ShiftHandover> => {
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('shift_handovers')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userData?.user?.id || null,
        acknowledged_by_name: acknowledgedByName.trim(),
      })
      .eq('id', handoverId)
      .select()
      .single();

    if (error) throw error;
    return data as ShiftHandover;
  },

  /**
   * Subscribe to real-time updates for shift handovers
   */
  subscribeToHandovers: (onUpdate: () => void) => {
    const channelId = `handovers_${Math.random().toString(36).substring(2, 9)}`;
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_handovers' },
        onUpdate
      )
      .subscribe();
  },

  unsubscribe: (channel: any) => {
    supabase.removeChannel(channel);
  },
};
