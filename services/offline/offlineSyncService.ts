import { supabase } from '../../lib/supabaseClient';
import { isFeatureEnabled } from '../../src/config/features';
import { offlineDb } from './offlineDb';
import {
  OfflineMutationType,
  OfflineQueueItem,
  QueueItemStatus,
  SyncSummary,
} from './offlineTypes';

type SyncListener = (summary: SyncSummary) => void;

class OfflineSyncService {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private syncTimer: any = null;
  private lastSyncTime: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Periodic check every 30 seconds if online
      this.syncTimer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.syncQueue().catch(() => {});
        }
      }, 30000);
    }
  }

  /**
   * Check if online and offline feature is enabled
   */
  public isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  /**
   * Subscribe to sync state changes
   */
  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notify() {
    const summary = await this.getSyncSummary();
    this.listeners.forEach((l) => l(summary));
  }

  private handleNetworkChange(online: boolean) {
    this.notify();
    if (online) {
      // Auto-trigger sync when transitioning back online
      setTimeout(() => {
        this.syncQueue().catch((err) => console.warn('Auto-sync on reconnect error:', err));
      }, 1000);
    }
  }

  /**
   * Get current summary statistics of the queue
   */
  public async getSyncSummary(): Promise<SyncSummary> {
    const isOnline = this.isOnline();
    let allItems: OfflineQueueItem[] = [];

    try {
      allItems = await offlineDb.getAllItems();
    } catch {
      allItems = [];
    }

    const pendingCount = allItems.filter((i) => i.status === 'pending' || i.status === 'syncing').length;
    const conflictCount = allItems.filter((i) => i.status === 'conflict').length;
    const failedCount = allItems.filter((i) => i.status === 'failed').length;

    let connectionState: SyncSummary['connectionState'] = 'online';
    if (!isOnline) {
      connectionState = 'offline';
    } else if (this.isSyncing) {
      connectionState = 'syncing';
    } else if (conflictCount > 0 || failedCount > 0) {
      connectionState = 'error';
    }

    return {
      connectionState,
      isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      conflictCount,
      failedCount,
      totalQueued: allItems.length,
      lastSyncTime: this.lastSyncTime,
    };
  }

  /**
   * Generate UUID v4 for client-side keys and trip IDs
   */
  public generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Enqueue a new mutation
   */
  public async enqueueMutation(
    type: OfflineMutationType,
    payload: any,
    options?: {
      id?: string;
      trip_id?: string | null;
      title?: string;
      client_timestamp?: string;
    }
  ): Promise<OfflineQueueItem> {
    const id = options?.id || this.generateId();
    const clientTimestamp = options?.client_timestamp || new Date().toISOString();

    const item: OfflineQueueItem = {
      id,
      type,
      trip_id: options?.trip_id || payload.trip_id || payload.tripId || null,
      payload,
      client_timestamp: clientTimestamp,
      created_at: Date.now(),
      status: 'pending',
      retry_count: 0,
      title: options?.title || this.getFriendlyTitle(type, payload),
    };

    await offlineDb.saveItem(item);
    await this.notify();

    // If online, immediately attempt to process
    if (this.isOnline() && !this.isSyncing) {
      this.syncQueue().catch((err) => console.warn('Immediate sync error:', err));
    }

    return item;
  }

  private getFriendlyTitle(type: OfflineMutationType, payload: any): string {
    switch (type) {
      case 'LOGBOOK_ENTRY':
        return `Logbook: ${payload.title || 'New Entry'}`;
      case 'LOGBOOK_CORRECTION':
        return `Correction: ${payload.title || 'Amendment'}`;
      case 'START_TRIP':
        return `Start Trip (${payload.driver_name || 'Driver'})`;
      case 'RECORD_ARRIVAL':
        return `Arrival at ${payload.place || 'Waypoint'}`;
      case 'RECORD_DEPARTURE':
        return `Departure from ${payload.place || 'Waypoint'}`;
      case 'END_TRIP':
        return `End Trip (ID: ${(payload.trip_id || '').slice(0, 8)})`;
      case 'CREATE_HANDOVER':
        return `Shift Handover (${payload.shift_name || 'Shift'})`;
      case 'ACKNOWLEDGE_HANDOVER':
        return `Acknowledge Handover (${payload.acknowledged_by_name || 'Officer'})`;
      default:
        return 'Queued Mutation';
    }
  }

  /**
   * Process all queued mutations sequentially (FIFO, strictly ordered per trip)
   */
  public async syncQueue(): Promise<{ synced: number; failed: number; conflicts: number }> {
    if (this.isSyncing || !this.isOnline()) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    await this.notify();

    let syncedCount = 0;
    let failedCount = 0;
    let conflictCount = 0;

    try {
      const items = await offlineDb.getPendingItems();

      // Track trip IDs that encountered failures or conflicts to preserve sequential dependency
      const blockedTripIds = new Set<string>();

      for (const item of items) {
        // If this item belongs to a trip whose previous step failed, defer it
        if (item.trip_id && blockedTripIds.has(item.trip_id)) {
          continue;
        }

        // Mark as syncing
        item.status = 'syncing';
        await offlineDb.saveItem(item);

        try {
          await this.executeMutation(item);
          // Mutation succeeded -> remove from queue or mark synced
          item.status = 'synced';
          await offlineDb.deleteItem(item.id);
          syncedCount++;
        } catch (error: any) {
          console.error(`Sync failed for item ${item.id} (${item.type}):`, error);

          const errorMessage = error?.message || String(error);
          const isConflict = this.detectConflict(error, item);

          if (isConflict) {
            item.status = 'conflict';
            item.conflict_reason = this.formatConflictReason(error, item);
            conflictCount++;
            if (item.trip_id) blockedTripIds.add(item.trip_id);
          } else {
            // General network / transient failure
            item.status = 'failed';
            item.retry_count = (item.retry_count || 0) + 1;
            item.error_message = errorMessage;
            failedCount++;
            if (item.trip_id) blockedTripIds.add(item.trip_id);
          }

          await offlineDb.saveItem(item);
        }
      }

      this.lastSyncTime = new Date().toISOString();
    } finally {
      this.isSyncing = false;
      await this.notify();
    }

    return { synced: syncedCount, failed: failedCount, conflicts: conflictCount };
  }

  /**
   * Determine if an error represents a business constraint conflict vs network glitch
   */
  private detectConflict(error: any, item: OfflineQueueItem): boolean {
    const msg = (error?.message || '').toLowerCase();
    const code = error?.code || '';

    // PostgreSQL unique constraint violations or check violations
    if (code === '23505' || code === '23514' || code === 'P0001') {
      // If duplicate idempotency key, it's actually harmless / already synced
      if (msg.includes('idempotency')) return false;
      return true;
    }

    if (
      msg.includes('already on another trip') ||
      msg.includes('cannot be less than') ||
      msg.includes('completed trip') ||
      msg.includes('not found') ||
      msg.includes('violates foreign key')
    ) {
      return true;
    }

    return false;
  }

  private formatConflictReason(error: any, item: OfflineQueueItem): string {
    const msg = error?.message || '';
    if (msg.includes('idx_one_ongoing_trip_per_vehicle') || msg.includes('already on another trip')) {
      return 'Vehicle is already registered to another active trip on the server.';
    }
    if (msg.includes('idx_one_ongoing_trip_per_driver')) {
      return 'Driver is currently assigned to another ongoing trip.';
    }
    if (msg.includes('status != completed') || msg.includes('trip completed')) {
      return 'Trip has already been completed or modified on the server.';
    }
    return msg || 'Constraint conflict rejected by the server.';
  }

  /**
   * Execute actual Supabase mutation on the server with client_timestamp and idempotency_key
   */
  private async executeMutation(item: OfflineQueueItem): Promise<any> {
    const { type, payload, client_timestamp, id } = item;

    switch (type) {
      case 'LOGBOOK_ENTRY': {
        const { data, error } = await supabase.rpc('log_event', {
          p_category: payload.category,
          p_action: payload.action || 'MANUAL_ENTRY',
          p_title: payload.title,
          p_description: payload.description,
          p_reference_type: payload.reference_type || null,
          p_reference_id: payload.reference_id || null,
          p_metadata: {
            ...(payload.metadata || {}),
            entered_offline: true,
            client_timestamp,
          },
          p_corrects_entry_id: payload.corrects_entry_id || null,
          p_client_timestamp: client_timestamp,
          p_idempotency_key: id,
        });

        if (error) {
          // If RPC fails because of optional params or signature fallback, try direct insert
          const { data: userData } = await supabase.auth.getUser();
          const { error: insertErr } = await supabase.from('logbook_entries').insert({
            id: id,
            reported_by: userData?.user?.id || null,
            reporter_name: payload.reporter_name || userData?.user?.user_metadata?.full_name || 'Staff Member',
            reporter_role: payload.reporter_role || 'staff',
            category: payload.category,
            action: payload.action || 'MANUAL_ENTRY',
            title: payload.title,
            description: payload.description,
            reference_type: payload.reference_type || null,
            reference_id: payload.reference_id || null,
            metadata: {
              ...(payload.metadata || {}),
              entered_offline: true,
              client_timestamp,
            },
            corrects_entry_id: payload.corrects_entry_id || null,
            client_timestamp,
            idempotency_key: id,
          });

          if (insertErr) {
            // Ignore duplicate idempotency key errors
            if (insertErr.code === '23505' && insertErr.message?.includes('idempotency')) {
              return;
            }
            throw insertErr;
          }
        }
        return data;
      }

      case 'LOGBOOK_CORRECTION': {
        const { data, error } = await supabase.rpc('log_event', {
          p_category: 'correction',
          p_action: 'ADD_CORRECTION',
          p_title: payload.title,
          p_description: payload.description,
          p_reference_type: payload.reference_type || 'logbook_entry',
          p_reference_id: payload.reference_id,
          p_metadata: {
            ...(payload.metadata || {}),
            entered_offline: true,
            client_timestamp,
          },
          p_corrects_entry_id: payload.corrects_entry_id,
          p_client_timestamp: client_timestamp,
          p_idempotency_key: id,
        });

        if (error) throw error;
        return data;
      }

      case 'START_TRIP': {
        const { data: userData } = await supabase.auth.getUser();
        const tripId = payload.id || item.trip_id || id;

        // 1. Insert vehicle_trip
        const { error: tripError } = await supabase.from('vehicle_trips').insert({
          id: tripId,
          vehicle_id: payload.vehicle_id,
          driver_id: payload.driver_id || null,
          driver_name: payload.driver_name,
          purpose: payload.purpose,
          status: 'ongoing',
          odometer_start: payload.odometer_start || null,
          logged_by: userData?.user?.id || null,
          started_at: client_timestamp,
          client_timestamp,
          idempotency_key: id,
        });

        if (tripError) {
          if (tripError.code === '23505' && tripError.message?.includes('idempotency')) {
            return tripId;
          }
          throw tripError;
        }

        // 2. Insert passengers
        if (payload.passengers && payload.passengers.length > 0) {
          const passengerRows = payload.passengers.map((p: any) => ({
            trip_id: tripId,
            person_id: p.person_id || null,
            passenger_name: typeof p === 'string' ? p : p.name,
          }));
          await supabase.from('trip_passengers').insert(passengerRows);
        }

        // 3. Insert initial stop
        if (payload.initial_destination && payload.initial_destination.trim() !== '') {
          await supabase.from('trip_stops').insert({
            trip_id: tripId,
            place: payload.initial_destination.trim(),
            departure_time: client_timestamp,
            client_timestamp,
          });
        }

        return tripId;
      }

      case 'RECORD_ARRIVAL': {
        const stopId = payload.id || id;
        const arrivalTime = payload.manual_time
          ? new Date(payload.manual_time).toISOString()
          : client_timestamp;

        const { error } = await supabase.from('trip_stops').insert({
          id: stopId,
          trip_id: payload.trip_id,
          place: payload.place.trim(),
          arrival_time: arrivalTime,
          manual_time_reason: payload.manual_reason || null,
          client_timestamp,
          idempotency_key: id,
        });

        if (error) {
          if (error.code === '23505' && error.message?.includes('idempotency')) return;
          throw error;
        }
        return;
      }

      case 'RECORD_DEPARTURE': {
        const departureTime = payload.manual_time
          ? new Date(payload.manual_time).toISOString()
          : client_timestamp;

        const updatePayload: any = {
          departure_time: departureTime,
        };
        if (payload.manual_reason) {
          updatePayload.manual_time_reason = payload.manual_reason.trim();
        }

        const { error } = await supabase
          .from('trip_stops')
          .update(updatePayload)
          .eq('id', payload.stop_id);

        if (error) throw error;
        return;
      }

      case 'END_TRIP': {
        const { error } = await supabase
          .from('vehicle_trips')
          .update({
            status: 'completed',
            odometer_end: payload.odometer_end || null,
            remarks: payload.remarks ? payload.remarks.trim() : null,
            completed_at: client_timestamp,
          })
          .eq('id', payload.trip_id);

        if (error) throw error;
        return;
      }

      case 'CREATE_HANDOVER': {
        const { data: userData } = await supabase.auth.getUser();
        const handoverId = payload.id || id;

        const { error } = await supabase.from('shift_handovers').insert({
          id: handoverId,
          outgoing_user: userData?.user?.id || null,
          outgoing_name: payload.outgoing_name.trim(),
          incoming_name: payload.incoming_name ? payload.incoming_name.trim() : null,
          shift_name: payload.shift_name.trim(),
          notes: payload.notes.trim(),
          pending_items: payload.pending_items ? payload.pending_items.trim() : null,
          created_at: client_timestamp,
          client_timestamp,
          idempotency_key: id,
        });

        if (error) {
          if (error.code === '23505' && error.message?.includes('idempotency')) return;
          throw error;
        }
        return;
      }

      case 'ACKNOWLEDGE_HANDOVER': {
        const { data: userData } = await supabase.auth.getUser();

        const { error } = await supabase
          .from('shift_handovers')
          .update({
            acknowledged_at: client_timestamp,
            acknowledged_by: userData?.user?.id || null,
            acknowledged_by_name: payload.acknowledged_by_name.trim(),
          })
          .eq('id', payload.handover_id);

        if (error) throw error;
        return;
      }

      default:
        throw new Error(`Unknown mutation type: ${type}`);
    }
  }

  /**
   * Retry a specific failed or conflict item
   */
  public async retryItem(id: string): Promise<void> {
    const item = await offlineDb.getItem(id);
    if (!item) return;

    item.status = 'pending';
    item.error_message = null;
    item.conflict_reason = null;
    await offlineDb.saveItem(item);
    await this.notify();

    if (this.isOnline() && !this.isSyncing) {
      this.syncQueue().catch(() => {});
    }
  }

  /**
   * Dismiss or remove an item manually from the queue
   */
  public async dismissItem(id: string): Promise<void> {
    await offlineDb.deleteItem(id);
    await this.notify();
  }
}

export const offlineSyncService = new OfflineSyncService();
