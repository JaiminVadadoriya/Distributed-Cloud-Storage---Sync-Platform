import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * ErrorInterceptor handles global RPC failures, including 
 * token expiration and unauthorized access.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 handling is managed by authInterceptor for robust refresh logic.
      // This interceptor only handles general error notifications.
      if (error.status === 401) {
        // Suppress generic error notifications for unauthorized access
        // as this is handled specifically by individual services (AuthService)
        // or redirected via interceptors.
        return throwError(() => error);
      }

      const errorMessage = error.error?.message || 'SYSTEM_ERR: Execution failure';
      notificationService.error(errorMessage);
      return throwError(() => error);
    })
  );
};
