import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';

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

/**
 * FolderService manages the logical hierarchy of storage containers.
 */
@Injectable({
  providedIn: 'root'
})
export class FolderService extends BaseService {
  private api = inject(ApiService);

  public getRootFolders(): Observable<FolderDto[]> {
    return this.api.get<ApiResponse<FolderDto[]>>('/folders/root').pipe(
      map(r => r.data ?? []),
      catchError(this.handleError<FolderDto[]>('GET_ROOT_FOLDERS', []))
    );
  }

  public getFolderById(id: string): Observable<FolderDto> {
    return this.api.get<ApiResponse<FolderDto>>(`/folders/${id}`).pipe(
      map(r => r.data),
      catchError(this.handleError<FolderDto>(`GET_FOLDER_${id}`))
    );
  }

  public createFolder(dto: CreateFolderDto): Observable<FolderDto> {
    return this.api.post<ApiResponse<FolderDto>>('/folders', dto).pipe(
      map(r => r.data),
      catchError(this.handleError<FolderDto>('CREATE_FOLDER'))
    );
  }

  public renameFolder(id: string, newName: string): Observable<FolderDto> {
    return this.api.patch<ApiResponse<FolderDto>>(`/folders/${id}/rename`, { newName }).pipe(
      map(r => r.data),
      catchError(this.handleError<FolderDto>(`RENAME_FOLDER_${id}`))
    );
  }

  public deleteFolder(id: string): Observable<void> {
    return this.api.delete<ApiResponse<void>>(`/folders/${id}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>(`DELETE_FOLDER_${id}`))
    );
  }
}
