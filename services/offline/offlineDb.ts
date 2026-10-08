import { OfflineQueueItem } from './offlineTypes';

const DB_NAME = 'BantayBayanOfflineDB';
const DB_VERSION = 1;
const QUEUE_STORE = 'offline_queue';

class OfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available in this environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('trip_id', 'trip_id', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Insert or update a queued item in IndexedDB
   */
  async saveItem(item: OfflineQueueItem): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.put(item);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieve all items currently in the queue
   */
  async getAllItems(): Promise<OfflineQueueItem[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = (req.result || []) as OfflineQueueItem[];
        // Sort chronologically ascending (FIFO)
        items.sort((a, b) => a.created_at - b.created_at);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all pending or failed items ready for sync attempt
   */
  async getPendingItems(): Promise<OfflineQueueItem[]> {
    const all = await this.getAllItems();
    return all.filter((i) => i.status === 'pending' || i.status === 'failed' || i.status === 'syncing');
  }

  /**
   * Get single item by ID
   */
  async getItem(id: string): Promise<OfflineQueueItem | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.get(id);

      req.onsuccess = () => resolve((req.result as OfflineQueueItem) || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete an item from the queue
   */
  async deleteItem(id: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Clean up all synced items
   */
  async clearSyncedItems(): Promise<void> {
    const all = await this.getAllItems();
    const synced = all.filter((i) => i.status === 'synced');
    for (const item of synced) {
      await this.deleteItem(item.id);
    }
  }
}

export const offlineDb = new OfflineDatabase();
