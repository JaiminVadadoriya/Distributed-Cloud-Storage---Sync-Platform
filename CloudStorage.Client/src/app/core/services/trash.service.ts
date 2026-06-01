import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { ApiService } from './api.service';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';
import { TrashItem } from '../models/file.model';

@Injectable({ providedIn: 'root' })
export class TrashService extends BaseService {
  private api = inject(ApiService);

  public getTrashItems(): Observable<TrashItem[]> {
    return this.withLoading(
      this.api.get<ApiResponse<TrashItem[]>>('/trash').pipe(
        map(r => r.data || []),
        catchError(this.handleError<TrashItem[]>('GET_TRASH', []))
      )
    );
  }

  public restoreFile(trashItemId: string): Observable<void> {
    return this.api.post<ApiResponse<void>>(`/trash/${trashItemId}/restore`, {}).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('RESTORE_FILE'))
    );
  }

  public permanentDelete(trashItemId: string): Observable<void> {
    return this.api.delete<ApiResponse<void>>(`/trash/${trashItemId}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('PERMANENT_DELETE'))
    );
  }

  public emptyTrash(): Observable<void> {
    return this.api.delete<ApiResponse<void>>('/trash/empty').pipe(
      map(() => void 0),
      catchError(this.handleError<void>('EMPTY_TRASH'))
    );
  }
}
