/** @vitest-environment jsdom */
import '@angular/compiler';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

describe('AuthService Refresh Fix', () => {
  let service: AuthService;
  let apiServiceMock: unknown;
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiServiceMock = { 
      post: vi.fn(),
      get: vi.fn()
    };
    routerMock = { navigate: vi.fn() };

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

  it('should return AUTH_REFRESH_TOKEN_MISSING without redirection if no user is logged in', async () => {
    // Ensure no refresh token and no user
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    
    // Attempt refresh
    try {
      await firstValueFrom(service.refreshToken());
      expect.fail('Should have thrown an error');
    } catch (err: unknown) {
      const error = err as Error;
      expect(error.message).toBe('AUTH_REFRESH_TOKEN_MISSING');
      // Check that logout/redirect was NOT called (because no user was active)
      expect(routerMock.navigate).not.toHaveBeenCalled();
    }
  });

  it('should call logout and redirect if user IS logged in but refresh token is missing', async () => {
    // Simulate active user but missing refresh token
    localStorage.setItem('user_data', JSON.stringify({ id: '1', username: 'test' }));
    localStorage.removeItem('refresh_token');
    
    // We need to re-initialize or set the signal
    const serviceInternal = service as unknown as { _currentUser: { set: (val: unknown) => void } };
    serviceInternal._currentUser.set({ id: '1', username: 'test' });

    try {
      await firstValueFrom(service.refreshToken());
      expect.fail('Should have thrown an error');
    } catch (err: unknown) {
      const error = err as Error;
      expect(error.message).toBe('AUTH_REFRESH_TOKEN_MISSING');
      // Check that logout/redirect WAS called
      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
    }
  });
});
