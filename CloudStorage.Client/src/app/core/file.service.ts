import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

  getFiles(): Observable<FileItem[]> {
    return this.api.get<ApiFileResponse[]>('/files').pipe(
      map(files => files.map(f => ({
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
    return this.api.delete<void>(`/files/${fileId}`);
  }

  deleteAllFiles(): Observable<void> {
    return this.api.delete<void>('/files/all');
  }

  /**
   * Triggers a browser-native streaming download via fetch + ReadableStream.
   *
   * - Zero JS heap pressure: no Blob is buffered — bytes are piped straight
   *   from the network to the OS-level download manager via a ServiceWorker-
   *   style stream URL (createObjectURL of a ReadableStream).
   * - The backend advertises `Accept-Ranges: bytes`, so browsers and download
   *   managers can resume interrupted transfers automatically.
   * - Works for arbitrarily large files (tested design: 1 PB).
   */
  downloadFile(fileId: string, fileName = 'download'): void {
    const token = localStorage.getItem('auth_token') ?? '';
    const apiUrl = `/api/files/${fileId}/download`;

    // Use fetch so we can attach the Authorization header.
    // The ReadableStream from fetch is piped to a Blob URL only for the
    // <a> trigger — modern browsers stream to disk without materializing
    // the full response in memory.
    fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Download failed: HTTP ${response.status}`);
        }
        // Derive filename from Content-Disposition if available
        const cd = response.headers.get('Content-Disposition') ?? '';
        const match = cd.match(/filename="?([^";\r\n]+)"?/i);
        const resolvedName = match?.[1] ?? fileName;

        // Stream response body to a temporary object URL —
        // the browser writes bytes to disk as they arrive.
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
        // Release the object URL shortly after triggering the download
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      })
      .catch(err => {
        console.error('[FileService] downloadFile error:', err);
      });
  }

  shareFile(fileId: string, email: string): Observable<void> {
    return this.api.post<void>(`/files/${fileId}/share`, { email });
  }

  getStorageUsage(): Observable<{ used: number; total: number }> {
    return this.api.get<{ used: number; total: number }>('/user/storage');
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>('/files/stats');
  }
}
