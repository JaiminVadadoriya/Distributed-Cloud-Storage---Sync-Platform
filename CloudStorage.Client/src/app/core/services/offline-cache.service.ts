import { Injectable, signal } from '@angular/core';

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

/**
 * OfflineCacheService manages the IndexedDB instance for 
 * local file metadata and pending operations.
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  private db: IDBDatabase | null = null;
  public readonly isReady = signal(false);

  private readonly DB_NAME = 'CloudStorageOffline';
  private readonly DB_VERSION = 1;
  private readonly FILE_STORE = 'fileMetadata';
  private readonly OPS_STORE = 'pendingOperations';
  private readonly SYNC_KEY = 'lastSyncTimestamp';

  constructor() {
    this.openDatabase();
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.FILE_STORE)) {
          db.createObjectStore(this.FILE_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.OPS_STORE)) {
          const opsStore = db.createObjectStore(this.OPS_STORE, { keyPath: 'id' });
          opsStore.createIndex('fileId', 'fileId', { unique: false });
          opsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isReady.set(true);
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.openDatabase();
  }

  // --- Meta Cache ---

  public async getCachedFiles(): Promise<CachedFileMetadata[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.FILE_STORE, 'readonly');
      const store = tx.objectStore(this.FILE_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getCachedFile(fileId: string): Promise<CachedFileMetadata | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.FILE_STORE, 'readonly');
      const store = tx.objectStore(this.FILE_STORE);
      const request = store.get(fileId);
      request.onsuccess = () => resolve(request.result ?? undefined);
      request.onerror = () => reject(request.error);
    });
  }

  public async updateCachedFile(file: CachedFileMetadata): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.FILE_STORE, 'readwrite');
      const store = tx.objectStore(this.FILE_STORE);
      store.put(file);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async removeCachedFile(fileId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.FILE_STORE, 'readwrite');
      const store = tx.objectStore(this.FILE_STORE);
      store.delete(fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Ops Cache ---

  public async addPendingOperation(op: PendingOperation): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.OPS_STORE, 'readwrite');
      const store = tx.objectStore(this.OPS_STORE);
      store.put(op);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getPendingOperations(): Promise<PendingOperation[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.OPS_STORE, 'readonly');
      const store = tx.objectStore(this.OPS_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const ops = (request.result as PendingOperation[]).sort((a, b) => a.timestamp - b.timestamp);
        resolve(ops);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async removePendingOperation(opId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.OPS_STORE, 'readwrite');
      const store = tx.objectStore(this.OPS_STORE);
      store.delete(opId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Sync State ---

  public getLastSyncTimestamp(): string | null {
    return localStorage.getItem(this.SYNC_KEY);
  }

  public async cacheFiles(files: CachedFileMetadata[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.FILE_STORE, 'readwrite');
      const store = tx.objectStore(this.FILE_STORE);
      // Optional: Clear existing files if you want a fresh sync
      // store.clear(); 
      files.forEach(f => store.put(f));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public setLastSyncTimestamp(timestamp: string): void {
    localStorage.setItem(this.SYNC_KEY, timestamp);
  }

  public async clearCache(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.FILE_STORE, this.OPS_STORE], 'readwrite');
      tx.objectStore(this.FILE_STORE).clear();
      tx.objectStore(this.OPS_STORE).clear();
      tx.oncomplete = () => {
        localStorage.removeItem(this.SYNC_KEY);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}
