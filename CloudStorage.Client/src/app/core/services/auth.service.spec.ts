import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthService, AuthResponse } from './auth.service';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { WritableSignal } from '@angular/core';

describe('AuthService', () => {
  let service: AuthService;
  let apiServiceMock: Mocked<ApiService>;
  let routerMock: Mocked<Router>;

  const mockResponse: AuthResponse = {
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    user: { id: 1, username: 'test', email: 'test@example.com', role: 'user' }
  };

  const mockApiResponse = {
    success: true,
    data: mockResponse,
    message: 'Success'
  };

  beforeEach(() => {
    apiServiceMock = { 
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    } as unknown as Mocked<ApiService>;
    routerMock = { navigate: vi.fn() } as unknown as Mocked<Router>;

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
    apiServiceMock.post.mockReturnValue(of(mockApiResponse));

    service.login({ identifier: 'test', password: 'password' }).subscribe(res => {
      expect(res).toEqual(mockResponse);
      expect(localStorage.getItem('auth_token')).toBe('mock-token');
      // Using Signals for state verification
      expect(service.isAuthenticated).toBe(true);
      expect(service.currentUser()).toEqual(mockResponse.user);
    });

    expect(apiServiceMock.post).toHaveBeenCalledWith('/auth/login', { identifier: 'test', password: 'password' });
  });

  it('should logout and clear tokens', () => {
    localStorage.setItem('auth_token', 'token');
    localStorage.setItem('user_data', JSON.stringify(mockResponse.user));
    
    // Simulate initial state using typed access to private member if necessary for tests
    const serviceInternal = service as unknown as { _currentUser: WritableSignal<unknown> };
    serviceInternal._currentUser.set(mockResponse.user);

    service.logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('user_data')).toBeNull();
    expect(service.isAuthenticated).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
