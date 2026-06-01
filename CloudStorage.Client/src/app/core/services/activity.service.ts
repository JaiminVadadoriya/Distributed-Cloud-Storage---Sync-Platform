import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';
import { AuditEntry } from '../models/file.model';

/**
 * ActivityService manages the system audit logs.
 */
@Injectable({
  providedIn: 'root'
})
export class ActivityService extends BaseService {
  private api = inject(ApiService);

  /**
   * Retrieve recent activity log entries for the current user.
   * @param type The type of activity to filter for (default: 'all').
   * @param limit Maximum number of entries to return (default: 50).
   */
  public getRecentActivity(type = 'all', limit = 50): Observable<AuditEntry[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (type !== 'all') params = params.set('type', type);

    return this.withLoading(
      this.api.get<ApiResponse<AuditEntry[]>>('/activity', params).pipe(
        map(r => r.data ?? []),
        catchError(this.handleError<AuditEntry[]>('GET_RECENT_ACTIVITY', []))
      )
    );
  }
}
