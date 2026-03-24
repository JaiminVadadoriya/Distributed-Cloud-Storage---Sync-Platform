import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OfflineCacheService, PendingOperation, CachedFileMetadata } from './offline-cache.service';
import { ConnectionStatusService } from './connection-status.service';
import { AuthService } from './auth.service';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';

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

/**
 * SyncEngineService orchestrates the bidirectional synchronization 
 * of file metadata between local cache and server.
 */
@Injectable({
  providedIn: 'root'
})
export class SyncEngineService extends BaseService {
  private http = inject(HttpClient);
  private offlineCache = inject(OfflineCacheService);
  private connectionStatus = inject(ConnectionStatusService);
  private authService = inject(AuthService);

  private readonly _isSyncing = signal(false);
  public readonly isSyncing = this._isSyncing.asReadonly();

  private readonly _conflicts = signal<ConflictInfo[]>([]);
  public readonly conflicts = this._conflicts.asReadonly();
  public readonly hasConflicts = computed(() => this._conflicts().length > 0);

  private readonly _pendingOpsCount = signal(0);
  public readonly pendingOpsCount = this._pendingOpsCount.asReadonly();
  public readonly hasPendingOps = computed(() => this._pendingOpsCount() > 0);

  private readonly _syncLog = signal<SyncLogEntry[]>([]);
  public readonly syncLog = this._syncLog.asReadonly();

  private log(level: 'info' | 'success' | 'warn' | 'error', message: string): void {
    this._syncLog.update(entries => [
      { timestamp: new Date(), level, message },
      ...entries.slice(0, 99)
    ]);
  }

  public clearLog(): void {
    this._syncLog.set([]);
  }

  /**
   * Orchestrates a full synchronization cycle.
   */
  public async performSync(): Promise<void> {
    if (this._isSyncing() || this.connectionStatus.isOffline() || !this.authService.isAuthenticated) {
      this.log('warn', this.connectionStatus.isOffline() ? 'SYNC_ABORTED: System offline.' : 'SYNC_ABORTED: Identity not verified.');
      return;
    }

    this._isSyncing.set(true);
    this.log('info', 'SYNC_INITIATED: Starting entropy resolution sequence...');
    
    try {
      const lastSync = this.offlineCache.getLastSyncTimestamp() || new Date(0).toISOString();
      this.log('info', `PULL_PHASE: Fetching deltas since ${new Date(lastSync).toLocaleTimeString()}...`);
      
      const delta = await this.pullServerChanges(lastSync);
      this.log('info', `PULL_COMPLETE: ${delta.changedFiles.length} objects updated, ${delta.deletedFileIds.length} objects purged.`);

      const conflicts: ConflictInfo[] = [];
      for (const serverFile of delta.changedFiles) {
        const cachedFile = await this.offlineCache.getCachedFile(serverFile.id);

        if (cachedFile && cachedFile.versionVector && serverFile.versionVector) {
          const conflictCheck = await this.checkConflict(serverFile.id, cachedFile.versionVector);

          if (conflictCheck.hasConflict) {
            this.log('warn', `CONFLICT_DETECTED: [${serverFile.fileName}] exists in dual state.`);
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
            continue;
          }
        }

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

      for (const deletedId of delta.deletedFileIds) {
        await this.offlineCache.removeCachedFile(deletedId);
      }

      this._conflicts.set(conflicts);

      if (conflicts.length > 0) {
        this.notificationService.warning(`SYNC_PARTIAL: ${conflicts.length} consistency faults detected.`);
      } else {
        this.log('success', 'SYNC_STABLE: Hierarchy synchronized without fault.');
      }

      await this.pushPendingOperations();
      this.offlineCache.setLastSyncTimestamp(delta.serverTimestampUtc);
      this.log('success', `SYNC_FINALIZED: Root timestamp updated to ${delta.serverTimestampUtc}.`);

    } catch (err: any) {
      this.log('error', `SYNC_FAULT: ${err.message || 'Unknown resolution failure'}.`);
      this.notificationService.error('SYNC_FAULT: Local cache mismatch. Retry scheduled.');
    } finally {
      this._isSyncing.set(false);
    }
  }

  private async pullServerChanges(sinceUtc: string): Promise<DeltaSyncResponse> {
    const params = new HttpParams().set('sinceUtc', sinceUtc);
    const response = await lastValueFrom(
      this.http.get<ApiResponse<DeltaSyncResponse>>(`${environment.apiUrl}/sync/delta`, { params })
    );
    if (!response.success || !response.data) throw new Error(response.message || 'PULL_REQ_FAILED');
    return response.data;
  }

  private async checkConflict(fileId: string, clientVersionVector: string): Promise<ConflictCheckResponse> {
    const response = await lastValueFrom(
      this.http.post<ApiResponse<ConflictCheckResponse>>(`${environment.apiUrl}/sync/check-conflicts`, {
        fileId,
        clientVersionVector,
        clientLastModifiedAt: new Date().toISOString()
      })
    );
    if (!response.success || !response.data) throw new Error(response.message || 'CONFLICT_REQ_FAILED');
    return response.data;
  }

  public async resolveConflict(fileId: string, resolution: 'KeepLocal' | 'KeepServer'): Promise<void> {
    const conflict = this._conflicts().find(c => c.fileId === fileId);
    if (!conflict) return;

    try {
      await lastValueFrom(
        this.http.post<ApiResponse>(`${environment.apiUrl}/sync/resolve`, {
          fileId,
          resolution: resolution === 'KeepLocal' ? 0 : 1,
          clientVersionVector: conflict.localVersionVector
        })
      );

      this._conflicts.update(conflicts => conflicts.filter(c => c.fileId !== fileId));

      if (resolution === 'KeepServer') {
        await this.offlineCache.updateCachedFile({
          id: conflict.fileId,
          fileName: conflict.fileName,
          size: conflict.serverSize,
          createdAt: '', 
          lastModifiedAt: conflict.serverLastModified,
          isShared: false,
          versionVector: conflict.serverVersionVector
        });
      }

      this.notificationService.success(`RESOLVED: [${conflict.fileName}] reconciled to ${resolution} state.`);
      this.log('success', `RECONCILED: "${conflict.fileName}" fixed.`);
    } catch (err) {
      this.notificationService.error(`FAULT: Resolution failed for [${conflict.fileName}].`);
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
        break; 
      }
    }
  }

  private async executePendingOperation(op: PendingOperation): Promise<void> {
    switch (op.type) {
      case 'delete':
        await lastValueFrom(this.http.delete<ApiResponse>(`${environment.apiUrl}/files/${op.fileId}`));
        break;
      default:
        console.warn(`[SyncEngine] UNKNOWN_OP_TYPE: ${op.type}`);
    }
  }

  public async refreshPendingOpsCount(): Promise<void> {
    const ops = await this.offlineCache.getPendingOperations();
    this._pendingOpsCount.set(ops.length);
  }

  public async simulateLocalEdit(fileId: string, fileName: string): Promise<void> {
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
    this.log('warn', `INJECT_FORK: Local edit simulated on "${fileName}".`);
  }
}
