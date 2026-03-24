import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * ErrorInterceptor handles global RPC failures, including 
 * token expiration and unauthorized access.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Attempting silent identity renewal
        return authService.refreshToken().pipe(
          switchMap(() => {
            const token = authService.getToken();
            const cloned = req.clone({
              setHeaders: { Authorization: `Bearer ${token}` }
            });
            return next(cloned);
          }),
          catchError((refreshError) => {
            authService.logout();
            notificationService.error('SECURITY_FAULT: Identity session expired.');
            router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          })
        );
      }

      const errorMessage = error.error?.message || 'SYSTEM_ERR: Execution failure';
      notificationService.error(errorMessage);
      return throwError(() => error);
    })
  );
};
