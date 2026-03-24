import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';

export interface ActivityLog {
  id: string;
  eventType: string;
  targetId: string | null;
  targetName: string | null;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private api = inject(ApiService);

  /**
   * Retrieve recent activity log entries for the current user.
   * @param limit Maximum number of entries to return (default: 50).
   */
  getRecentActivity(limit = 50): Observable<ActivityLog[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.api.get<ApiResponse<ActivityLog[]>>('/activity', params).pipe(
      map(r => r.data ?? [])
    );
  }
}
