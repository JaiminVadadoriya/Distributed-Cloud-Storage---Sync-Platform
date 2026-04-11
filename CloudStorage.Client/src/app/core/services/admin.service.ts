import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';
import { AuditEntry } from '../models/audit.model';

// ─── Admin Domain Models ────────────────────────────────────────

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  storageUsed: number;
  storageQuota: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number; // seconds
  cpuUsage: number; // 0-100
  memoryUsed: number; // bytes
  memoryTotal: number; // bytes
  diskUsed: number; // bytes
  diskTotal: number; // bytes
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number; // 0-100
  avgResponseMs: number;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  latencyMs?: number;
}

export interface AdminStats {
  totalFiles: number;
  totalUsers: number;
  totalStorageUsed: number;
  totalStorageLimit: number;
  activeUsersLast24h: number;
  suspendedUsers: number;
  uploadsToday: number;
  downloadsToday: number;
  newUsersThisWeek: number;
  activeSessionsNow: number;
  filesTrend: number;
  usersTrend: number;
  storageTrend: number;
  storageHistory: number[];
  trafficHistory: number[];
}

export interface AdminAuditFilter {
  count?: number;
}

// ─── Admin Service ──────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AdminService extends BaseService {
  private api = inject(ApiService);

  // ── User Management ──────────────────────────────────────────

  public getUsers(): Observable<AdminUser[]> {
    return this.api.get<ApiResponse<AdminUser[]>>('/admin/users').pipe(
      map(r => r.data ?? []),
      catchError(this.handleError<AdminUser[]>('GET_ADMIN_USERS', []))
    );
  }

  public createUser(user: Partial<AdminUser>): Observable<AdminUser> {
    const payload = {
      username: user.username,
      email: user.email,
      password: (user as any).password, // Explicitly pass password from form
      role: user.role,
      initialQuota: user.storageQuota
    };
    return this.api.post<ApiResponse<AdminUser>>('/admin/users', payload).pipe(
      map(r => r.data!),
      catchError(this.handleError<AdminUser>('CREATE_USER'))
    );
  }

  public updateUserQuota(id: number, newQuota: number): Observable<AdminUser> {
    return this.api.patch<ApiResponse<AdminUser>>(`/admin/users/${id}/quota`, { newQuota }).pipe(
      map(r => r.data!),
      catchError(this.handleError<AdminUser>('UPDATE_QUOTA'))
    );
  }

  public toggleUserStatus(id: number, isActive: boolean): Observable<void> {
    return this.api.post<ApiResponse<void>>(`/admin/users/${id}/toggle-status`, isActive).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('TOGGLE_USER_STATUS'))
    );
  }

  public impersonateUser(id: number): Observable<{ token: string }> {
    return this.api.post<ApiResponse<{ token: string }>>(`/admin/users/${id}/impersonate`, {}).pipe(
      map(r => r.data!),
      catchError(this.handleError<{ token: string }>('IMPERSONATE_USER'))
    );
  }

  // ── System Health ─────────────────────────────────────────────

  public getSystemHealth(): Observable<SystemHealth> {
    return this.api.get<ApiResponse<SystemHealth>>('/admin/health').pipe(
      map(r => r.data!),
      catchError(this.handleError<SystemHealth>('GET_SYSTEM_HEALTH'))
    );
  }

  public getAdminStats(): Observable<AdminStats> {
    return this.api.get<ApiResponse<AdminStats>>('/admin/stats').pipe(
      map(r => r.data!),
      catchError(this.handleError<AdminStats>('GET_ADMIN_STATS'))
    );
  }

  // ── Audit Logs ────────────────────────────────────────────────

  public getAuditLogs(count = 50): Observable<AuditEntry[]> {
    const params = new HttpParams().set('count', count.toString());

    return this.api.get<ApiResponse<AuditEntry[]>>('/admin/audit', params).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError<AuditEntry[]>('GET_ADMIN_AUDIT_LOGS', []))
    );
  }
}
