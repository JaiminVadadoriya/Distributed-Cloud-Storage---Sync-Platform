import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

/**
 * AuthInterceptor injects the identity Bearer token into 
 * all outgoing system RPCs and handles 401/429 errors.
 */
let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Skip token injection and refresh logic for public auth endpoints.
  const url = req.url.toLowerCase();
  const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/password-reset'];
  const isPublicEndpoint = publicEndpoints.some(e => url.includes(e));

  console.log(`[AuthI] ${req.method} ${url} | isPublic: ${isPublicEndpoint} | hasToken: ${!!token}`);

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
      // Handle 401 Unauthorized or 429 Too Many Requests
      // ONLY attempt refresh if it's NOT a public endpoint and we were using a token
      const hasToken = authReq.headers.has('Authorization');
      
      // CRITICAL: Explicitly ensure public endpoints NEVER trigger refresh logic
      if (isPublicEndpoint) {
        return throwError(() => error);
      }
                             
      if ((error.status === 401 || error.status === 429) && hasToken) {
        return handleRefresh(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handleRefresh(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService) {
  if (!isRefreshing) {
    console.log(`[AuthI] Refreshing session... (Triggered by: ${req.url})`);
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response) => {
        console.log(`[AuthI] Refresh success: Updating queue`);
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);
        return next(req.clone({
          setHeaders: { Authorization: `Bearer ${response.accessToken}` }
        }));
      }),
      catchError((err) => {
        console.error(`[AuthI] Refresh FAILED: Propagating error to queue`, err);
        isRefreshing = false;
        const currentSubject = refreshTokenSubject;
        // Create new subject first so subsequent 401s don't use the error-d one
        refreshTokenSubject = new BehaviorSubject<string | null>(null);
        // Error the OLD subject to notify waiting requests
        currentSubject.error(err);
        
        authService.logout();
        return throwError(() => err);
      })
    );
  } else {
    console.log(`[AuthI] Refresh in progress: Queuing: ${req.url}`);
    // If already refreshing, wait for the new token
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => {
        console.log(`[AuthI] Queue released for: ${req.url}`);
        return next(req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        }));
      }),
      catchError((err) => {
        // This handles the error passed down from currentSubject.error(err)
        console.error(`[AuthI] Queue received failure for: ${req.url}`);
        return throwError(() => err);
      })
    );
  }
}
