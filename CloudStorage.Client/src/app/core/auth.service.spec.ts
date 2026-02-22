import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthService, AuthResponse } from './auth.service';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let apiServiceMock: any;
  let routerMock: any;

  const mockResponse: AuthResponse = {
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    user: { id: '1', username: 'test', email: 'test@example.com' }
  };

  beforeEach(() => {
    apiServiceMock = { post: vi.fn() } as any;
    routerMock = { navigate: vi.fn() } as any;

    // Clear local storage before each test
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login and store tokens', () => {
    apiServiceMock.post.mockReturnValue(of(mockResponse));

    service.login({ identifier: 'test', password: 'password' }).subscribe(res => {
      expect(res).toEqual(mockResponse);
      expect(localStorage.getItem('auth_token')).toBe('mock-token');
      expect(service.isAuthenticated).toBe(true);
      expect(service.currentUserValue).toEqual(mockResponse.user);
    });

    expect(apiServiceMock.post).toHaveBeenCalledWith('/auth/login', { identifier: 'test', password: 'password' });
  });

  it('should register and store tokens', () => {
    apiServiceMock.post.mockReturnValue(of(mockResponse));

    service.register({ username: 'test', email: 'test@test.com', password: 'pwd' }).subscribe();

    expect(apiServiceMock.post).toHaveBeenCalledWith('/auth/register', { username: 'test', email: 'test@test.com', password: 'pwd' });
    expect(localStorage.getItem('auth_token')).toBe('mock-token');
  });

  it('should logout and clear tokens', () => {
    localStorage.setItem('auth_token', 'token');
    localStorage.setItem('user_data', JSON.stringify(mockResponse.user));

    service.logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('user_data')).toBeNull();
    expect(service.isAuthenticated).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
