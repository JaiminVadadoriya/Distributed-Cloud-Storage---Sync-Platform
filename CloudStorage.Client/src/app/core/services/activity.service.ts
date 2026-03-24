import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';

export interface ActivityLog {
  id: string;
  eventType: string;
  targetId: string | null;
  targetName: string | null;
  timestamp: string;
}

/**
 * ActivityService manages the system audit logs.
 * Extended with BaseService for unified error handling and loading states.
 */
@Injectable({
  providedIn: 'root'
})
export class ActivityService extends BaseService {
  private api = inject(ApiService);

  /**
   * Retrieve recent activity log entries for the current user.
   * @param limit Maximum number of entries to return (default: 50).
   */
  public getRecentActivity(limit = 50): Observable<ActivityLog[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.withLoading(
      this.api.get<ApiResponse<ActivityLog[]>>('/activity', params).pipe(
        map(r => r.data ?? []),
        catchError(this.handleError<ActivityLog[]>('GET_RECENT_ACTIVITY', []))
      )
    );
  }
}
