import { supabase } from '../lib/supabaseClient';
import { ShiftHandover } from '../types';
import { offlineSyncService } from './offline/offlineSyncService';
import { isFeatureEnabled } from '../src/config/features';

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
   * Create a new shift handover record (outgoing officer) with offline support
   */
  createHandover: async (params: CreateHandoverParams): Promise<ShiftHandover> => {
    const handoverId = offlineSyncService.generateId();
    const clientTimestamp = new Date().toISOString();

    if (isFeatureEnabled('OFFLINE_SYNC') && !offlineSyncService.isOnline()) {
      await offlineSyncService.enqueueMutation(
        'CREATE_HANDOVER',
        { ...params, id: handoverId },
        {
          id: handoverId,
          client_timestamp: clientTimestamp,
          title: `Shift Handover (${params.shift_name})`,
        }
      );
      return {
        id: handoverId,
        outgoing_user: null,
        outgoing_name: params.outgoing_name.trim(),
        incoming_name: params.incoming_name ? params.incoming_name.trim() : null,
        shift_name: params.shift_name.trim(),
        notes: params.notes.trim(),
        pending_items: params.pending_items ? params.pending_items.trim() : null,
        created_at: clientTimestamp,
        client_timestamp: clientTimestamp,
        idempotency_key: handoverId,
      };
    }

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('shift_handovers')
      .insert({
        id: handoverId,
        outgoing_user: userData?.user?.id || null,
        outgoing_name: params.outgoing_name.trim(),
        incoming_name: params.incoming_name ? params.incoming_name.trim() : null,
        shift_name: params.shift_name.trim(),
        notes: params.notes.trim(),
        pending_items: params.pending_items ? params.pending_items.trim() : null,
        created_at: clientTimestamp,
        client_timestamp: clientTimestamp,
        idempotency_key: handoverId,
      })
      .select()
      .single();

    if (error) {
      if (isFeatureEnabled('OFFLINE_SYNC') && (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network'))) {
        await offlineSyncService.enqueueMutation(
          'CREATE_HANDOVER',
          { ...params, id: handoverId },
          {
            id: handoverId,
            client_timestamp: clientTimestamp,
            title: `Shift Handover (${params.shift_name})`,
          }
        );
        return {
          id: handoverId,
          outgoing_user: userData?.user?.id || null,
          outgoing_name: params.outgoing_name.trim(),
          incoming_name: params.incoming_name ? params.incoming_name.trim() : null,
          shift_name: params.shift_name.trim(),
          notes: params.notes.trim(),
          pending_items: params.pending_items ? params.pending_items.trim() : null,
          created_at: clientTimestamp,
          client_timestamp: clientTimestamp,
          idempotency_key: handoverId,
        };
      }
      throw error;
    }
    return data as ShiftHandover;
  },

  /**
   * Acknowledge an existing shift handover record (incoming officer) with offline support
   */
  acknowledgeHandover: async (
    handoverId: string,
    acknowledgedByName: string
  ): Promise<ShiftHandover> => {
    const clientTimestamp = new Date().toISOString();

    if (isFeatureEnabled('OFFLINE_SYNC') && !offlineSyncService.isOnline()) {
      await offlineSyncService.enqueueMutation(
        'ACKNOWLEDGE_HANDOVER',
        { handover_id: handoverId, acknowledged_by_name: acknowledgedByName },
        {
          client_timestamp: clientTimestamp,
          title: `Acknowledge Handover (${acknowledgedByName})`,
        }
      );
      return {
        id: handoverId,
        outgoing_name: '',
        shift_name: '',
        notes: '',
        created_at: clientTimestamp,
        acknowledged_at: clientTimestamp,
        acknowledged_by_name: acknowledgedByName.trim(),
      };
    }

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('shift_handovers')
      .update({
        acknowledged_at: clientTimestamp,
        acknowledged_by: userData?.user?.id || null,
        acknowledged_by_name: acknowledgedByName.trim(),
      })
      .eq('id', handoverId)
      .select()
      .single();

    if (error) {
      if (isFeatureEnabled('OFFLINE_SYNC') && (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network'))) {
        await offlineSyncService.enqueueMutation(
          'ACKNOWLEDGE_HANDOVER',
          { handover_id: handoverId, acknowledged_by_name: acknowledgedByName },
          {
            client_timestamp: clientTimestamp,
            title: `Acknowledge Handover (${acknowledgedByName})`,
          }
        );
        return {
          id: handoverId,
          outgoing_name: '',
          shift_name: '',
          notes: '',
          created_at: clientTimestamp,
          acknowledged_at: clientTimestamp,
          acknowledged_by_name: acknowledgedByName.trim(),
        };
      }
      throw error;
    }
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
