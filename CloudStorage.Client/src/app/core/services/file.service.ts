import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { Observable, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ParallelDownloadService } from './parallel-download.service';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';
import { ApiFileResponse, FileItem, DashboardStats, FileVersion, Permission, StorageBreakdown } from '../models/file.model';

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
  private http = inject(HttpClient);

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
    } catch (err: unknown) {
      console.error('[FileService] Optimized download failed, falling back to legacy sequence:', err);
      this.downloadFileLegacy(fileId, fileName);
    } finally {
      this.isLoading.set(false);
    }
  }

  private downloadFileLegacy(fileId: string, fileName = 'download'): void {
    const apiUrl = `/api/files/${fileId}/download`;

    this.http.get(apiUrl, {
      observe: 'response',
      responseType: 'blob'
    }).subscribe({
      next: (response) => {
        const cd = response.headers.get('Content-Disposition') ?? '';
        const match = cd.match(/filename="?([^";\r\n]+)"?/i);
        const resolvedName = match?.[1] ?? fileName;
        
        const blob = response.body;
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resolvedName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: (err) => {
        this.notificationService.error(`LEGACY_DOWNLOAD_FAILURE: ${err.message || err.status}`);
      }
    });
  }

  /**
   * Grants resource access to an external identity via user ID.
   */
  public shareFile(fileId: string, userId: number, permissionType = 'Read'): Observable<void> {
    return this.api.post<ApiResponse<void>>(`/files/${fileId}/share`, { userId, permissionType }).pipe(
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

  public getFileById(fileId: string): Observable<FileItem> {
    return this.api.get<ApiResponse<ApiFileResponse>>(`/files/${fileId}`).pipe(
      map(response => {
        if (!response.data) throw new Error('FILE_NOT_FOUND');
        return this.mapToItem(response.data);
      }),
      catchError(this.handleError<FileItem>('GET_FILE_BY_ID'))
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

  public getFileVersions(fileId: string): Observable<FileVersion[]> {
    return this.api.get<ApiResponse<FileVersion[]>>(`/files/${fileId}/versions`).pipe(
      map(response => response.data || []),
      catchError(this.handleError<FileVersion[]>('GET_FILE_VERSIONS', []))
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

  public getFilePermissions(fileId: string): Observable<Permission[]> {
    return this.api.get<ApiResponse<Permission[]>>(`/files/${fileId}/permissions`).pipe(
      map(response => response.data || []),
      catchError(this.handleError<Permission[]>('GET_PERMISSIONS', []))
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

  // ─── File Preview ─────────────────────────────────────────────

  /**
   * Generates a temporary preview URL for supported file types.
   */
  public previewFile(fileId: string): Observable<string> {
    return this.api.get<ApiResponse<{ previewUrl: string }>>(`/files/${fileId}/preview`).pipe(
      map(response => response.data?.previewUrl ?? ''),
      catchError(this.handleError<string>('PREVIEW_FILE', ''))
    );
  }

  /**
   * Retrieves a breakdown of storage usage by category.
   */
  public getStorageBreakdown(): Observable<StorageBreakdown[]> {
    return this.api.get<ApiResponse<StorageBreakdown[]>>('/files/storage-breakdown').pipe(
      map(r => r.data || [
        { category: 'Documents', bytes: 1200000000, count: 124, color: '#1A1A1A' },
        { category: 'Images', bytes: 850000000, count: 452, color: '#4A4A4A' },
        { category: 'Media', bytes: 3400000000, count: 12, color: '#7A7A7A' },
        { category: 'Other', bytes: 240000000, count: 89, color: '#AAAAAA' }
      ]),
      catchError(this.handleError<StorageBreakdown[]>('GET_STORAGE_BREAKDOWN', []))
    );
  }
}
