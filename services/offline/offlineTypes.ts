/**
 * Type definitions for Offline Queue & Synchronization
 */

export type OfflineMutationType =
  | 'LOGBOOK_ENTRY'
  | 'LOGBOOK_CORRECTION'
  | 'START_TRIP'
  | 'RECORD_ARRIVAL'
  | 'RECORD_DEPARTURE'
  | 'END_TRIP'
  | 'CREATE_HANDOVER'
  | 'ACKNOWLEDGE_HANDOVER';

export type QueueItemStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface OfflineQueueItem {
  id: string; // Client-generated UUID (also used as idempotency key)
  type: OfflineMutationType;
  trip_id?: string | null; // For enforcing sequential trip action ordering
  payload: any;
  client_timestamp: string; // ISO 8601 string of original device time
  created_at: number; // Unix timestamp in milliseconds for FIFO sorting
  status: QueueItemStatus;
  retry_count: number;
  error_message?: string | null;
  conflict_reason?: string | null;
  title?: string; // Human-friendly preview summary for queue UI
}

export type SyncState = 'online' | 'offline' | 'syncing' | 'error';

export interface SyncSummary {
  connectionState: SyncState;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  failedCount: number;
  totalQueued: number;
  lastSyncTime?: string | null;
}
