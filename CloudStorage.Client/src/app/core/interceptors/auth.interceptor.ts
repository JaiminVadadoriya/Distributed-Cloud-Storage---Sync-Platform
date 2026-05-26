import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

/**
 * AuthInterceptor injects the identity Bearer token into
 * all outgoing system RPCs and handles 401 errors with a
 * coordinated token-refresh strategy.
 *
 * NOTE: Refresh coordination state (`isRefreshing`, `refreshTokenSubject`) is stored
 * on the AuthService (singleton) rather than module-level variables to ensure proper
 * reset on logout and to avoid race conditions in zoneless change detection.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Skip token injection and refresh logic for public auth endpoints.
  const url = req.url.toLowerCase();
  const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/password-reset'];
  const isPublicEndpoint = publicEndpoints.some(e => url.includes(e));

  if (isDevMode()) {
    console.log(`[AuthI] ${req.method} ${url} | isPublic: ${isPublicEndpoint} | hasToken: ${!!token}`);
  }

  let authReq = req;
  // Only inject token if we have one and it's NOT a public auth endpoint
  if (token && !isPublicEndpoint) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const hasToken = authReq.headers.has('Authorization');

      // CRITICAL: Explicitly ensure public endpoints NEVER trigger refresh logic
      if (isPublicEndpoint) {
        return throwError(() => error);
      }

      if (error.status === 401 && hasToken) {
        return handleRefresh(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handleRefresh(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService) {
  // Delegate to AuthService which owns the refresh coordination state
  return authService.refreshToken().pipe(
    switchMap((response) => {
      if (isDevMode()) {
        console.log(`[AuthI] Refresh success: Retrying ${req.url}`);
      }
      return next(req.clone({
        setHeaders: { Authorization: `Bearer ${response.accessToken}` }
      }));
    }),
    catchError((err) => {
      if (isDevMode()) {
        console.error(`[AuthI] Refresh FAILED for: ${req.url}`, err);
      }
      return throwError(() => err);
    })
  );
}
