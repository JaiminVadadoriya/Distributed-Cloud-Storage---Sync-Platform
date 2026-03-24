import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { ApiService } from './api.service';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';
import { Permission } from '../models/file.model';

@Injectable({ providedIn: 'root' })
export class PermissionService extends BaseService {
  private api = inject(ApiService);

  public getPermissions(fileId: string): Observable<Permission[]> {
    return this.api.get<ApiResponse<Permission[]>>(`/files/${fileId}/permissions`).pipe(
      map(r => r.data || []),
      catchError(this.handleError<Permission[]>('GET_PERMISSIONS', []))
    );
  }

  public addPermission(fileId: string, email: string, permissionType: string): Observable<void> {
    return this.api.post<ApiResponse<void>>(`/files/${fileId}/permissions`, { email, permissionType }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('ADD_PERMISSION'))
    );
  }

  public updatePermission(fileId: string, userId: number, permissionType: string): Observable<void> {
    return this.api.patch<ApiResponse<void>>(`/files/${fileId}/permissions/${userId}`, { permissionType }).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('UPDATE_PERMISSION'))
    );
  }

  public removePermission(fileId: string, userId: number): Observable<void> {
    return this.api.delete<ApiResponse<void>>(`/files/${fileId}/permissions/${userId}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('REMOVE_PERMISSION'))
    );
  }
}
