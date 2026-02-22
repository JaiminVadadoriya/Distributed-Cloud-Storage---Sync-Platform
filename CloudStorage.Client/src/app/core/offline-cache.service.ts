import { Injectable, signal, computed, NgZone, inject } from '@angular/core';

export interface CachedFileMetadata {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
  lastModifiedAt: string;
  isShared: boolean;
  versionVector: string | null;
}

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'rename';
  fileId: string;
  timestamp: number;
  payload?: Record<string, unknown>;
}

const DB_NAME = 'CloudStorageOffline';
const DB_VERSION = 1;
const FILE_STORE = 'fileMetadata';
const OPS_STORE = 'pendingOperations';

@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  private db: IDBDatabase | null = null;
  private readonly isReady = signal(false);

  constructor() {
    this.openDatabase();
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(FILE_STORE)) {
          db.createObjectStore(FILE_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(OPS_STORE)) {
          const opsStore = db.createObjectStore(OPS_STORE, { keyPath: 'id' });
          opsStore.createIndex('fileId', 'fileId', { unique: false });
          opsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isReady.set(true);
        resolve(this.db);
      };

      request.onerror = () => {
        console.error('[OfflineCache] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.openDatabase();
  }

  // ──────────────────────────────────────────────
  // File Metadata Cache
  // ──────────────────────────────────────────────

  async cacheFiles(files: CachedFileMetadata[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readwrite');
      const store = tx.objectStore(FILE_STORE);

      // Clear existing and write new
      store.clear();
      for (const file of files) {
        store.put(file);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedFiles(): Promise<CachedFileMetadata[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readonly');
      const store = tx.objectStore(FILE_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedFile(fileId: string): Promise<CachedFileMetadata | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readonly');
      const store = tx.objectStore(FILE_STORE);
      const request = store.get(fileId);

      request.onsuccess = () => resolve(request.result ?? undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async updateCachedFile(file: CachedFileMetadata): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readwrite');
      const store = tx.objectStore(FILE_STORE);
      store.put(file);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async removeCachedFile(fileId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readwrite');
      const store = tx.objectStore(FILE_STORE);
      store.delete(fileId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ──────────────────────────────────────────────
  // Pending Operations Queue
  // ──────────────────────────────────────────────

  async addPendingOperation(op: PendingOperation): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OPS_STORE, 'readwrite');
      const store = tx.objectStore(OPS_STORE);
      store.put(op);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OPS_STORE, 'readonly');
      const store = tx.objectStore(OPS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by timestamp ascending (oldest first)
        const ops = (request.result as PendingOperation[])
          .sort((a, b) => a.timestamp - b.timestamp);
        resolve(ops);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingOperations(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OPS_STORE, 'readwrite');
      const store = tx.objectStore(OPS_STORE);
      store.clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async removePendingOperation(opId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OPS_STORE, 'readwrite');
      const store = tx.objectStore(OPS_STORE);
      store.delete(opId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ──────────────────────────────────────────────
  // Sync Timestamp
  // ──────────────────────────────────────────────

  getLastSyncTimestamp(): string | null {
    return localStorage.getItem('lastSyncTimestamp');
  }

  setLastSyncTimestamp(timestamp: string): void {
    localStorage.setItem('lastSyncTimestamp', timestamp);
  }

  async clearCache(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([FILE_STORE, OPS_STORE], 'readwrite');
      tx.objectStore(FILE_STORE).clear();
      tx.objectStore(OPS_STORE).clear();

      tx.oncomplete = () => {
        localStorage.removeItem('lastSyncTimestamp');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}
