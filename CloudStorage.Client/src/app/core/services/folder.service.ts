import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';
import { Folder, Permission } from '../models/file.model';

// FolderDto is deprecated in favor of Folder from file.model.ts

export interface CreateFolderDto {
  name: string;
  parentFolderId?: string | null;
}

/**
 * FolderService manages the logical hierarchy of storage containers.
 */
@Injectable({
  providedIn: 'root'
})
export class FolderService extends BaseService {
  private api = inject(ApiService);

  public getRootFolders(): Observable<Folder[]> {
    return this.api.get<ApiResponse<Folder[]>>('/folders/root').pipe(
      map(r => r.data ?? []),
      catchError(this.handleError<Folder[]>('GET_ROOT_FOLDERS', []))
    );
  }

  public getFolderById(id: string): Observable<Folder> {
    return this.api.get<ApiResponse<Folder>>(`/folders/${id}`).pipe(
      map(r => r.data),
      catchError(this.handleError<Folder>(`GET_FOLDER_${id}`))
    );
  }

  public createFolder(dto: CreateFolderDto): Observable<Folder> {
    return this.api.post<ApiResponse<Folder>>('/folders', dto).pipe(
      map(r => r.data),
      catchError(this.handleError<Folder>('CREATE_FOLDER'))
    );
  }

  public renameFolder(id: string, newName: string): Observable<Folder> {
    return this.api.patch<ApiResponse<Folder>>(`/folders/${id}/rename`, { newName }).pipe(
      map(r => r.data),
      catchError(this.handleError<Folder>(`RENAME_FOLDER_${id}`))
    );
  }

  public deleteFolder(id: string): Observable<void> {
    return this.api.delete<ApiResponse<void>>(`/folders/${id}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>(`DELETE_FOLDER_${id}`))
    );
  }

  public moveFolder(id: string, newParentFolderId: string | null): Observable<Folder> {
    return this.api.patch<ApiResponse<Folder>>(`/folders/${id}/move`, { newParentFolderId }).pipe(
      map(r => r.data),
      catchError(this.handleError<Folder>(`MOVE_FOLDER_${id}`))
    );
  }

  public shareFolder(id: string, userId: number, permissionType = 'Read'): Observable<void> {
    return this.api.post<ApiResponse<void>>(`/folders/${id}/share`, { userId, permissionType }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>(`SHARE_FOLDER_${id}`))
    );
  }

  public getFolderPermissions(id: string): Observable<Permission[]> {
    return this.api.get<ApiResponse<Permission[]>>(`/folders/${id}/permissions`).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError<Permission[]>(`GET_FOLDER_PERMISSIONS_${id}`, []))
    );
  }

  public removeFolderPermission(id: string, userId: number): Observable<void> {
    return this.api.delete<ApiResponse<void>>(`/folders/${id}/permissions/${userId}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>(`REMOVE_FOLDER_PERMISSION_${id}`))
    );
  }

  public updateFolderPermission(id: string, userId: number, permissionType: string): Observable<void> {
    return this.api.patch<ApiResponse<void>>(`/folders/${id}/permissions/${userId}`, { permissionType }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>(`UPDATE_FOLDER_PERMISSION_${id}`))
    );
  }
}
