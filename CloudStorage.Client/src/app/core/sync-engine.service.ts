import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './api.service';
import { OfflineCacheService, CachedFileMetadata, PendingOperation } from './offline-cache.service';
import { ConnectionStatusService } from './connection-status.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

export interface DeltaSyncResponse {
  serverTimestampUtc: string;
  changedFiles: ServerFileItem[];
  deletedFileIds: string[];
}

export interface ServerFileItem {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
  lastModifiedAt: string;
  isShared: boolean;
  versionVector: string | null;
}

export interface ConflictInfo {
  fileId: string;
  fileName: string;
  localLastModified: string;
  serverLastModified: string;
  localVersionVector: string | null;
  serverVersionVector: string | null;
  serverSize: number;
  serverVersion: number;
}

export interface ConflictCheckResponse {
  hasConflict: boolean;
  serverVersionVector: string | null;
  serverLastModifiedAt: string;
  serverFileName: string;
  serverSize: number;
  serverVersion: number;
}

export interface SyncLogEntry {
  timestamp: Date;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncEngineService {
  private http = inject(HttpClient);
  private offlineCache = inject(OfflineCacheService);
  private connectionStatus = inject(ConnectionStatusService);
  private notifications = inject(NotificationService);
  private authService = inject(AuthService);

  private readonly _isSyncing = signal(false);
  public readonly isSyncing = this._isSyncing.asReadonly();

  private readonly _conflicts = signal<ConflictInfo[]>([]);
  public readonly conflicts = this._conflicts.asReadonly();
  public readonly hasConflicts = computed(() => this._conflicts().length > 0);

  private readonly _pendingOpsCount = signal(0);
  public readonly pendingOpsCount = this._pendingOpsCount.asReadonly();
  public readonly hasPendingOps = computed(() => this._pendingOpsCount() > 0);

  // ── Sync Log ─────────────────────────────────────────────────────────
  private readonly _syncLog = signal<SyncLogEntry[]>([]);
  public readonly syncLog = this._syncLog.asReadonly();

  private log(level: 'info' | 'success' | 'warn' | 'error', message: string): void {
    this._syncLog.update(entries => [
      { timestamp: new Date(), level, message },
      ...entries.slice(0, 99)   // keep last 100
    ]);
  }

  clearLog(): void {
    this._syncLog.set([]);
  }

  /**
   * Perform a full sync cycle:
   * 1. Pull server changes since last sync
   * 2. Detect conflicts via version vector comparison
   * 3. Push pending offline operations
   */
  async performSync(): Promise<void> {
    if (this._isSyncing() || this.connectionStatus.isOffline() || !this.authService.isAuthenticated) {
      this.log('warn', this.connectionStatus.isOffline() ? 'Sync skipped — offline.' : 'Sync skipped — not authenticated.');
      return;
    }

    this._isSyncing.set(true);
    this.log('info', 'Sync started …');
    try {
      // Step 1: Pull server changes
      const lastSync = this.offlineCache.getLastSyncTimestamp() || new Date(0).toISOString();
      this.log('info', `Pulling changes since ${new Date(lastSync).toLocaleTimeString()} …`);
      const delta = await this.pullServerChanges(lastSync);
      this.log('info', `Server returned ${delta.changedFiles.length} changed, ${delta.deletedFileIds.length} deleted.`);

      // Step 2: Check for conflicts on each changed file
      const conflicts: ConflictInfo[] = [];
      for (const serverFile of delta.changedFiles) {
        const cachedFile = await this.offlineCache.getCachedFile(serverFile.id);

        if (cachedFile && cachedFile.versionVector && serverFile.versionVector) {
          // Both have version vectors — check for concurrency
          const conflictCheck = await this.checkConflict(
            serverFile.id,
            cachedFile.versionVector
          );

          if (conflictCheck.hasConflict) {
            this.log('warn', `⚡ Conflict on "${serverFile.fileName}" — local vs server modification.`);
            conflicts.push({
              fileId: serverFile.id,
              fileName: serverFile.fileName,
              localLastModified: cachedFile.lastModifiedAt,
              serverLastModified: serverFile.lastModifiedAt,
              localVersionVector: cachedFile.versionVector,
              serverVersionVector: serverFile.versionVector,
              serverSize: conflictCheck.serverSize,
              serverVersion: conflictCheck.serverVersion
            });
            continue; // Don't update cache for conflicting files
          }
        }

        // No conflict — update the local cache
        this.log('info', `✓ Updated "${serverFile.fileName}" from server.`);
        await this.offlineCache.updateCachedFile({
          id: serverFile.id,
          fileName: serverFile.fileName,
          size: serverFile.size,
          createdAt: serverFile.createdAt,
          lastModifiedAt: serverFile.lastModifiedAt,
          isShared: serverFile.isShared,
          versionVector: serverFile.versionVector
        });
      }

      // Handle deletions
      for (const deletedId of delta.deletedFileIds) {
        this.log('info', `✗ Removed deleted file ${deletedId} from cache.`);
        await this.offlineCache.removeCachedFile(deletedId);
      }

      // Update conflicts signal
      this._conflicts.set(conflicts);

      if (conflicts.length > 0) {
        this.notifications.warning(
          `${conflicts.length} file conflict(s) detected. Please resolve them.`
        );
      } else {
        this.log('success', `Sync complete — no conflicts.`);
      }

      // Step 3: Push pending offline operations
      await this.pushPendingOperations();

      // Update last sync timestamp
      this.offlineCache.setLastSyncTimestamp(delta.serverTimestampUtc);
      this.log('success', `Last sync updated to ${new Date(delta.serverTimestampUtc).toLocaleTimeString()}.`);

    } catch (err) {
      console.error('[SyncEngine] Sync failed:', err);
      this.log('error', `Sync failed: ${err instanceof Error ? err.message : String(err)}`);
      this.notifications.error('Sync failed. Will retry when connection is stable.');
    } finally {
      this._isSyncing.set(false);
    }
  }

  private async pullServerChanges(sinceUtc: string): Promise<DeltaSyncResponse> {
    const params = new HttpParams().set('sinceUtc', sinceUtc);
    const response = await firstValueFrom(
      this.http.get<ApiResponse<DeltaSyncResponse>>(`${environment.apiUrl}/sync/delta`, { params })
    );
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to pull changes');
    return response.data;
  }

  private async checkConflict(fileId: string, clientVersionVector: string): Promise<ConflictCheckResponse> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<ConflictCheckResponse>>(`${environment.apiUrl}/sync/check-conflicts`, {
        fileId,
        clientVersionVector,
        clientLastModifiedAt: new Date().toISOString()
      })
    );
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to check conflicts');
    return response.data;
  }

  async resolveConflict(fileId: string, resolution: 'KeepLocal' | 'KeepServer'): Promise<void> {
    const conflict = this._conflicts().find(c => c.fileId === fileId);
    if (!conflict) return;

    try {
      await firstValueFrom(
        this.http.post<ApiResponse>(`${environment.apiUrl}/sync/resolve`, {
          fileId,
          resolution: resolution === 'KeepLocal' ? 0 : 1,
          clientVersionVector: conflict.localVersionVector
        })
      );

      // Remove from conflicts list
      this._conflicts.update(conflicts =>
        conflicts.filter(c => c.fileId !== fileId)
      );

      // If KeepServer, update cache with server data
      if (resolution === 'KeepServer') {
        await this.offlineCache.updateCachedFile({
          id: conflict.fileId,
          fileName: conflict.fileName,
          size: conflict.serverSize,
          createdAt: '', // Will be refreshed on next full sync
          lastModifiedAt: conflict.serverLastModified,
          isShared: false,
          versionVector: conflict.serverVersionVector
        });
      }

    await this.notifications.success(
        `Conflict resolved for "${conflict.fileName}": ${resolution === 'KeepLocal' ? 'kept local version' : 'kept server version'}`
      );
      this.log('success', `Resolved "${conflict.fileName}" → ${resolution}.`);
    } catch (err) {
      console.error('[SyncEngine] Conflict resolution failed:', err);
      this.notifications.error(`Failed to resolve conflict for "${conflict.fileName}".`);
    }
  }

  async resolveAllConflicts(resolution: 'KeepLocal' | 'KeepServer'): Promise<void> {
    const conflicts = [...this._conflicts()];
    for (const conflict of conflicts) {
      await this.resolveConflict(conflict.fileId, resolution);
    }
  }

  private async pushPendingOperations(): Promise<void> {
    const ops = await this.offlineCache.getPendingOperations();
    this._pendingOpsCount.set(ops.length);

    for (const op of ops) {
      try {
        await this.executePendingOperation(op);
        await this.offlineCache.removePendingOperation(op.id);
        this._pendingOpsCount.update(c => c - 1);
      } catch (err) {
        console.error(`[SyncEngine] Failed to push operation ${op.id}:`, err);
        // Stop pushing on first failure to maintain order
        break;
      }
    }
  }

  private async executePendingOperation(op: PendingOperation): Promise<void> {
    switch (op.type) {
      case 'delete':
        await firstValueFrom(
          this.http.delete<ApiResponse>(`${environment.apiUrl}/files/${op.fileId}`)
        );
        break;
      case 'rename':
        // Future implementation — currently files don't have rename API
        console.warn('[SyncEngine] Rename operation not yet implemented');
        break;
      default:
        console.warn(`[SyncEngine] Unknown operation type: ${op.type}`);
    }
  }

  async refreshPendingOpsCount(): Promise<void> {
    const ops = await this.offlineCache.getPendingOperations();
    this._pendingOpsCount.set(ops.length);
  }

  /**
   * Simulate a local file modification by writing a "forked" version vector
   * into the offline cache. On next sync, the server will detect a conflict.
   */
  async simulateLocalEdit(fileId: string, fileName: string): Promise<void> {
    const cached = await this.offlineCache.getCachedFile(fileId);
    const fakeVector = `{"${fileId.substring(0, 8)}":${Date.now()}}`;
    const fakeModified = new Date().toISOString();
    await this.offlineCache.updateCachedFile({
      id: fileId,
      fileName,
      size: cached?.size ?? 0,
      createdAt: cached?.createdAt ?? fakeModified,
      lastModifiedAt: fakeModified,
      isShared: cached?.isShared ?? false,
      versionVector: fakeVector,
    });
    this.log('warn', `🖊 Simulated local edit on "${fileName}" — version vector forked.`);
  }
}
