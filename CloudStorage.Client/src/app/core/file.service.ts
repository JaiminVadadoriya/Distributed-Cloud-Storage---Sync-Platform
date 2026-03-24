import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ParallelDownloadService } from './parallel-download.service';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  modified: Date;
  owner: string;
  versionVector: string | null;
  lastModifiedAt: string;
}

export interface ApiFileResponse {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
  lastModifiedAt: string;
  isShared: boolean;
  ownerId?: string;
  versionVector: string | null;
}

export interface DashboardStats {
  totalStorageBytes: number;
  maxStorageBytes: number;
  totalFiles: number;
  recentUploads: number;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private api = inject(ApiService);
  private parallelDownloadService = inject(ParallelDownloadService);

  getFiles(): Observable<FileItem[]> {
    return this.api.get<ApiResponse<ApiFileResponse[]>>('/files').pipe(
      map(response => (response.data || []).map(f => ({
        id: f.id,
        name: f.fileName,
        size: f.size,
        type: f.fileName.split('.').pop() || 'unknown',
        modified: new Date(f.createdAt),
        owner: f.isShared ? 'Shared' : 'me',
        versionVector: f.versionVector ?? null,
        lastModifiedAt: f.lastModifiedAt ?? f.createdAt
      })))
    );
  }

  deleteFile(fileId: string): Observable<void> {
    return this.api.delete<ApiResponse>(`/files/${fileId}`).pipe(map(() => void 0));
  }

  deleteAllFiles(): Observable<void> {
    return this.api.delete<ApiResponse>('/files/all').pipe(map(() => void 0));
  }

  /**
   * Triggers an optimized download.
   * 
   * - Uses ParallelDownloadService for high-speed direct-to-disk streaming.
   * - Native chunking and SAS tokens ensure 50GB+ files are handled with ease.
   */
  async downloadFile(fileId: string, fileName = 'download'): Promise<void> {
    try {
      await this.parallelDownloadService.downloadLargeFile(fileId);
    } catch (err: any) {
      console.error('[FileService] Optimized download failed, falling back to proxy:', err);
      this.downloadFileLegacy(fileId, fileName);
    }
  }

  /**
   * Fallback downloader for legacy environments or small files.
   */
  private downloadFileLegacy(fileId: string, fileName = 'download'): void {
    const token = localStorage.getItem('auth_token') ?? '';
    const apiUrl = `/api/files/${fileId}/download`;

    // Use fetch so we can attach the Authorization header.
    fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Download failed: HTTP ${response.status}`);
        }
        const cd = response.headers.get('Content-Disposition') ?? '';
        const match = cd.match(/filename="?([^";\r\n]+)"?/i);
        const resolvedName = match?.[1] ?? fileName;

        return response.blob().then(blob => ({ blob, resolvedName }));
      })
      .then(({ blob, resolvedName }) => {
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = resolvedName;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      })
      .catch(err => {
        console.error('[FileService] downloadFileLegacy error:', err);
      });
  }

  shareFile(fileId: string, email: string): Observable<void> {
    return this.api.post<ApiResponse>(`/files/${fileId}/share`, { email }).pipe(map(() => void 0));
  }

  getStorageUsage(): Observable<{ used: number; total: number }> {
    return this.api.get<ApiResponse<{ used: number; total: number }>>('/user/storage').pipe(
      map(response => response.data)
    );
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.api.get<ApiResponse<DashboardStats>>('/files/stats').pipe(
      map(response => response.data)
    );
  }
}
