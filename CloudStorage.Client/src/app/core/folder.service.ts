import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface FolderDto {
  id: string;
  name: string;
  ownerId: number;
  parentFolderId: string | null;
  createdAt: string;
}

export interface CreateFolderDto {
  name: string;
  parentFolderId?: string | null;
}

export interface RenameFolderDto {
  newName: string;
}

export interface MoveFolderDto {
  newParentFolderId: string | null;
}

export interface FolderShareDto {
  userId: number;
  permissionType: string;
}

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private api = inject(ApiService);

  getRootFolders(): Observable<FolderDto[]> {
    return this.api.get<ApiResponse<FolderDto[]>>('/folders/root').pipe(
      map(r => r.data ?? [])
    );
  }

  getFolderById(id: string): Observable<FolderDto> {
    return this.api.get<ApiResponse<FolderDto>>(`/folders/${id}`).pipe(
      map(r => r.data)
    );
  }

  createFolder(dto: CreateFolderDto): Observable<FolderDto> {
    return this.api.post<ApiResponse<FolderDto>>('/folders', dto).pipe(
      map(r => r.data)
    );
  }

  renameFolder(id: string, newName: string): Observable<FolderDto> {
    return this.api.patch<ApiResponse<FolderDto>>(`/folders/${id}/rename`, { newName }).pipe(
      map(r => r.data)
    );
  }

  moveFolder(id: string, newParentFolderId: string | null): Observable<FolderDto> {
    return this.api.patch<ApiResponse<FolderDto>>(`/folders/${id}/move`, { newParentFolderId }).pipe(
      map(r => r.data)
    );
  }

  deleteFolder(id: string): Observable<void> {
    return this.api.delete<ApiResponse>(`/folders/${id}`).pipe(map(() => void 0));
  }

  shareFolder(id: string, userId: number, permissionType: string): Observable<void> {
    return this.api.post<ApiResponse>(`/folders/${id}/share`, { userId, permissionType }).pipe(
      map(() => void 0)
    );
  }
}
