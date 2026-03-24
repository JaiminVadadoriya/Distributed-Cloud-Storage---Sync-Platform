import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ParallelDownloadService } from './parallel-download.service';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';
import { ApiFileResponse, FileItem, DashboardStats } from '../models/file.model';

/**
 * FileService manages all file-related operations, including listing, downloading, 
 * sharing, and storage metrics. Inherits from BaseService for robust error handling.
 */
@Injectable({
  providedIn: 'root'
})
export class FileService extends BaseService {
  private api = inject(ApiService);
  private parallelDownloadService = inject(ParallelDownloadService);

  /**
   * Fetches the list of all accessible file entities.
   */
  public getFiles(): Observable<FileItem[]> {
    return this.withLoading(
      this.api.get<ApiResponse<ApiFileResponse[]>>('/files').pipe(
        map(response => (response.data || []).map(f => this.mapToItem(f))),
        catchError(this.handleError<FileItem[]>('GET_FILES', []))
      )
    );
  }

  /**
   * Maps a raw API file response to the internal FileItem model.
   */
  private mapToItem(f: ApiFileResponse): FileItem {
    return {
      id: f.id,
      name: f.fileName,
      size: f.size,
      type: f.fileName.split('.').pop() || 'unknown',
      modified: new Date(f.createdAt),
      owner: f.isShared ? 'Shared' : 'me',
      versionVector: f.versionVector ?? null,
      lastModifiedAt: f.lastModifiedAt ?? f.createdAt
    };
  }

  /**
   * Permanently deletes a file object by ID.
   */
  public deleteFile(fileId: string): Observable<void> {
    return this.api.delete<ApiResponse<void>>(`/files/${fileId}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('DELETE_FILE'))
    );
  }

  /**
   * Purges all file records for the current user.
   */
  public deleteAllFiles(): Observable<void> {
    return this.api.delete<ApiResponse<void>>('/files/all').pipe(
      map(() => void 0),
      catchError(this.handleError<void>('PURGE_ALL_FILES'))
    );
  }

  /**
   * Executes a high-performance parallelized download.
   */
  public async downloadFile(fileId: string, fileName = 'download'): Promise<void> {
    try {
      this.isLoading.set(true);
      await this.parallelDownloadService.downloadLargeFile(fileId);
    } catch (err: any) {
      console.error('[FileService] Optimized download failed, falling back to legacy sequence:', err);
      this.downloadFileLegacy(fileId, fileName);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Fallback for enterprise environments with restricted protocol access.
   */
  private downloadFileLegacy(fileId: string, fileName = 'download'): void {
    const token = localStorage.getItem('auth_token') ?? '';
    const apiUrl = `/api/files/${fileId}/download`;

    fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP_FAULT: ${response.status}`);
        const cd = response.headers.get('Content-Disposition') ?? '';
        const match = cd.match(/filename="?([^";\r\n]+)"?/i);
        const resolvedName = match?.[1] ?? fileName;
        return response.blob().then(blob => ({ blob, resolvedName }));
      })
      .then(({ blob, resolvedName }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resolvedName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      })
      .catch(err => {
        this.notificationService.error(`LEGACY_DOWNLOAD_FAILURE: ${err.message}`);
      });
  }

  /**
   * Grants resource access to an external identity via email.
   */
  public shareFile(fileId: string, email: string): Observable<void> {
    return this.api.post<ApiResponse<void>>(`/files/${fileId}/share`, { email }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('SHARE_FILE'))
    );
  }

  /**
   * Retrieves current capacity metrics for the authenticated user.
   */
  public getStorageUsage(): Observable<{ used: number; total: number }> {
    return this.api.get<ApiResponse<{ used: number; total: number }>>('/user/storage').pipe(
      map(response => response.data),
      catchError(this.handleError<{ used: number; total: number }>('GET_STORAGE_USAGE'))
    );
  }

  /**
   * Fetches high-level metrics for the dashboard view.
   */
  public getDashboardStats(): Observable<DashboardStats> {
    return this.api.get<ApiResponse<DashboardStats>>('/files/stats').pipe(
      map(response => response.data),
      catchError(this.handleError<DashboardStats>('GET_DASHBOARD_STATS'))
    );
  }

  // ─── File Details ──────────────────────────────────────────────

  public getFileById(fileId: string): Observable<ApiFileResponse> {
    return this.api.get<ApiResponse<ApiFileResponse>>(`/files/${fileId}`).pipe(
      map(response => response.data),
      catchError(this.handleError<ApiFileResponse>('GET_FILE_BY_ID'))
    );
  }

  public renameFile(fileId: string, newName: string): Observable<void> {
    return this.api.patch<ApiResponse<void>>(`/files/${fileId}/rename`, { newName }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('RENAME_FILE'))
    );
  }

  public moveFile(fileId: string, targetFolderId: string | null): Observable<void> {
    return this.api.patch<ApiResponse<void>>(`/files/${fileId}/move`, { targetFolderId }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('MOVE_FILE'))
    );
  }

  // ─── Version History ───────────────────────────────────────────

  public getFileVersions(fileId: string): Observable<any[]> {
    return this.api.get<ApiResponse<any[]>>(`/files/${fileId}/versions`).pipe(
      map(response => response.data || []),
      catchError(this.handleError<any[]>('GET_FILE_VERSIONS', []))
    );
  }

  public restoreVersion(fileId: string, versionId: string): Observable<ApiFileResponse> {
    return this.api.post<ApiResponse<ApiFileResponse>>(`/files/${fileId}/restore/${versionId}`, {}).pipe(
      map(response => response.data),
      catchError(this.handleError<ApiFileResponse>('RESTORE_VERSION'))
    );
  }

  // ─── Bulk Operations ──────────────────────────────────────────

  public bulkDelete(fileIds: string[]): Observable<void> {
    return this.api.post<ApiResponse<void>>('/files/bulk-delete', { fileIds }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('BULK_DELETE'))
    );
  }

  public bulkMove(fileIds: string[], targetFolderId: string | null): Observable<void> {
    return this.api.post<ApiResponse<void>>('/files/bulk-move', { fileIds, targetFolderId }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('BULK_MOVE'))
    );
  }

  public bulkShare(fileIds: string[], userId: number, permissionType: string): Observable<void> {
    return this.api.post<ApiResponse<void>>('/files/bulk-share', { fileIds, userId, permissionType }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('BULK_SHARE'))
    );
  }

  // ─── Permission Management ────────────────────────────────────

  public getFilePermissions(fileId: string): Observable<any[]> {
    return this.api.get<ApiResponse<any[]>>(`/files/${fileId}/permissions`).pipe(
      map(response => response.data || []),
      catchError(this.handleError<any[]>('GET_PERMISSIONS', []))
    );
  }

  public removePermission(fileId: string, targetUserId: number): Observable<void> {
    return this.api.delete<ApiResponse<void>>(`/files/${fileId}/permissions/${targetUserId}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('REMOVE_PERMISSION'))
    );
  }

  public updatePermission(fileId: string, targetUserId: number, permissionType: string): Observable<void> {
    return this.api.patch<ApiResponse<void>>(`/files/${fileId}/permissions/${targetUserId}`, { permissionType }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('UPDATE_PERMISSION'))
    );
  }

  // ─── Shared Files ─────────────────────────────────────────────

  public getSharedFiles(): Observable<FileItem[]> {
    return this.withLoading(
      this.api.get<ApiResponse<ApiFileResponse[]>>('/files/shared').pipe(
        map(response => (response.data || []).map(f => this.mapToItem({ ...f, isShared: true }))),
        catchError(this.handleError<FileItem[]>('GET_SHARED_FILES', []))
      )
    );
  }
}
