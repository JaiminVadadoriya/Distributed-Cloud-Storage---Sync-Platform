import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap, throwError, catchError, finalize, shareReplay } from 'rxjs';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * AuthService manages the user identity lifecycle.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseService {
  private api = inject(ApiService);
  private router = inject(Router);

  protected readonly _currentUser = signal<User | null>(null);
  public readonly currentUser = this._currentUser.asReadonly();
  
  private refreshObservable: Observable<AuthResponse> | null = null;
  private readonly _isRefreshing = signal<boolean>(false);
  public readonly isRefreshing = this._isRefreshing.asReadonly();
  
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  constructor() {
    super();
    this.loadStoredUser();
  }

  private loadStoredUser() {
    try {
      const storedUser = localStorage.getItem(this.USER_KEY);
      if (storedUser && storedUser !== 'undefined') {
        this._currentUser.set(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  get isAuthenticated(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return false;
    
    // For E2E bypass: if token exists, we are authenticated.
    // Signals will eventually settle, but for the Guard, the presence of token is enough.
    if (!this._currentUser()) {
      this.loadStoredUser();
    }
    return true;
  }

  public login(credentials: { identifier: string; password: string }): Observable<AuthResponse> {
    // Use real API for all logins now that the backend is ready

    return this.withLoading(
      this.api.post<ApiResponse<AuthResponse>>('/auth/login', credentials).pipe(
        map(response => {
          if (!response.success || !response.data) throw new Error(response.message || 'AUTH_LOGIN_REJECTED');
          return response.data;
        }),
        tap(data => this.handleAuthResponse(data)),
        catchError(this.handleError<AuthResponse>('LOGIN'))
      )
    );
  }

  public register(userData: { username: string; email: string; password: string }): Observable<AuthResponse> {
    return this.withLoading(
      this.api.post<ApiResponse<AuthResponse>>('/auth/register', userData).pipe(
        map(response => {
          if (!response.success || !response.data) throw new Error(response.message || 'AUTH_REGISTRATION_REJECTED');
          return response.data;
        }),
        tap(data => this.handleAuthResponse(data)),
        catchError(this.handleError<AuthResponse>('REGISTER'))
      )
    );
  }

  public logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    
    this._currentUser.set(response.user);
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public refreshToken(): Observable<AuthResponse> {
    // If a refresh is already in progress, return the same observable
    if (this.refreshObservable) {
      console.log('[AuthS] Returning existing refresh observable');
      return this.refreshObservable;
    }

    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      console.warn('[AuthS] Refresh Token MISSING from storage');
      if (this.currentUser()) {
        this.logout();
      }
      return throwError(() => new Error('AUTH_REFRESH_TOKEN_MISSING'));
    }

    console.log('[AuthS] Starting NEW refresh API call...');
    this._isRefreshing.set(true);
    
    this.refreshObservable = this.api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }).pipe(
      map(response => {
        if (!response.success || !response.data) throw new Error(response.message || 'AUTH_REFRESH_FAILED');
        return response.data;
      }),
      tap(data => {
        console.log('[AuthS] Refresh Success: Updating session');
        this.handleAuthResponse(data);
      }),
      catchError(err => {
        console.error('[AuthS] Refresh API Error:', err);
        this.logout();
        return throwError(() => err);
      }),
      finalize(() => {
        console.log('[AuthS] Refresh observable cleared');
        this.refreshObservable = null;
        this._isRefreshing.set(false);
      }),
      shareReplay(1)
    );

    return this.refreshObservable;
  }

  public requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.api.post<ApiResponse<void>>('/auth/password-reset-request', { email }).pipe(
      map(response => ({ message: response.message || 'SUCCESS' })),
      catchError(this.handleError<{ message: string }>('RESET_REQUEST'))
    );
  }

  public resetPassword(data: { token: string; newPassword: string }): Observable<{ message: string }> {
    return this.api.post<ApiResponse<void>>('/auth/password-reset', data).pipe(
      map(response => ({ message: response.message || 'SUCCESS' })),
      catchError(this.handleError<{ message: string }>('RESET_CONFIRM'))
    );
  }

  // ─── Profile Management ────────────────────────────────────────

  public updateProfile(dto: { username?: string; email?: string }): Observable<User> {
    return this.withLoading(
      this.api.put<ApiResponse<User>>('/auth/profile', dto).pipe(
        map(response => {
          if (!response.success || !response.data) throw new Error(response.message || 'PROFILE_UPDATE_FAILED');
          // Update stored user data
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
          this._currentUser.set(response.data);
          return response.data;
        }),
        catchError(this.handleError<User>('UPDATE_PROFILE'))
      )
    );
  }

  public changePassword(dto: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.withLoading(
      this.api.put<ApiResponse<void>>('/auth/change-password', dto).pipe(
        map(() => void 0),
        catchError(this.handleError<void>('CHANGE_PASSWORD'))
      )
    );
  }

  public searchUsers(query: string): Observable<{ id: number; username: string; email: string }[]> {
    return this.api.get<ApiResponse<{ id: number; username: string; email: string }[]>>(`/auth/users/search?q=${encodeURIComponent(query)}`).pipe(
      map(response => response.data || []),
      catchError(this.handleError<{ id: number; username: string; email: string }[]>('SEARCH_USERS', []))
    );
  }
}
