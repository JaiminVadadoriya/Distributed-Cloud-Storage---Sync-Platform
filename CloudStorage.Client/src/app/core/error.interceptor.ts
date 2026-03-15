import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';
import { Router } from '@angular/router';

function extractErrorMessage(err: HttpErrorResponse): string | null {
  if (!err || !err.error) return null;
  
  if (typeof err.error === 'object' && err.error.message) {
    return err.error.message;
  }
  
  if (typeof err.error === 'object' && err.error.errors) {
    const firstKey = Object.keys(err.error.errors)[0];
    if (firstKey && err.error.errors[firstKey].length > 0) {
      return err.error.errors[firstKey][0];
    }
  }
  
  if (typeof err.error === 'object' && err.error.title) {
    return err.error.title;
  }
  
  if (typeof err.error === 'string') {
    return err.error;
  }
  
  return null;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.error instanceof ErrorEvent) {
        errorMessage = `Network error: ${error.error.message}`;
      } else {
        switch (error.status) {
          case 400:
            errorMessage = extractErrorMessage(error) || 'Bad Request. Please check your input.';
            break;
          case 401:
            if (req.url.includes('/auth/login')) {
              errorMessage = 'Wrong username or password. Please check your credentials.';
            } else {
              errorMessage = 'Session expired or unauthorized. Please log in again.';
              router.navigate(['/auth/login']);
            }
            break;
          case 403:
            errorMessage = 'You do not have permission to perform this action.';
            break;
          case 404:
            errorMessage = 'The requested resource was not found.';
            break;
          case 409:
            errorMessage = extractErrorMessage(error) || 'Conflict: The resource already exists.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please slow down and try again later.';
            break;
          case 500:
            errorMessage = 'Server error. Our team has been notified.';
            break;
          case 503:
            errorMessage = 'Service unavailable. Please check your connection or try again later.';
            break;
          case 0:
            errorMessage = 'Could not connect to the server. Please check your internet connection.';
            break;
          default:
            errorMessage = extractErrorMessage(error) || `Error ${error.status}: ${error.statusText}`;
            break;
        }
      }

      notificationService.error(errorMessage);
      return throwError(() => error);
    })
  );
};
