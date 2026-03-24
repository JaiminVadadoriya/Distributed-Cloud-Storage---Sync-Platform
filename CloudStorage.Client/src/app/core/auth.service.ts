import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, tap, throwError } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { Router } from '@angular/router';

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}



@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  constructor() {
    this.loadStoredUser();
  }

  private loadStoredUser() {
    try {
      const storedUser = localStorage.getItem(this.USER_KEY);
      if (storedUser && storedUser !== 'undefined') {
        this.currentUserSubject.next(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Error parsing stored user data', e);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.currentUserSubject.value && !!localStorage.getItem(this.TOKEN_KEY);
  }

  login(credentials: { identifier: string; password: string }): Observable<AuthResponse> {
    return this.api.post<ApiResponse<AuthResponse>>('/auth/login', credentials).pipe(
      map(response => {
        if (!response.success || !response.data) throw new Error(response.message || 'Login failed');
        return response.data;
      }),
      tap(data => this.handleAuthResponse(data))
    );
  }

  register(userData: { username: string; email: string; password: string }): Observable<AuthResponse> {
    return this.api.post<ApiResponse<AuthResponse>>('/auth/register', userData).pipe(
      map(response => {
        if (!response.success || !response.data) throw new Error(response.message || 'Registration failed');
        return response.data;
      }),
      tap(data => this.handleAuthResponse(data))
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  private handleAuthResponse(response: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, response.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }
    return this.api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }).pipe(
      map(response => {
        if (!response.success || !response.data) throw new Error(response.message || 'Refresh failed');
        return response.data;
      }),
      tap(data => this.handleAuthResponse(data))
    );
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.api.post<ApiResponse>('/auth/password-reset-request', { email }).pipe(
      map(response => ({ message: response.message }))
    );
  }

  resetPassword(data: { token: string; newPassword: string }): Observable<{ message: string }> {
    return this.api.post<ApiResponse>('/auth/password-reset', data).pipe(
      map(response => ({ message: response.message }))
    );
  }
}
