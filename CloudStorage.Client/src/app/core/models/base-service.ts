import { HttpErrorResponse } from '@angular/common/http';
import { inject, signal } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { throwError, Observable, catchError, of } from 'rxjs';

/**
 * Abstract Base Service providing common infrastructure for all application services.
 * Implements centralized error handling and operation state tracking.
 */
export abstract class BaseService {
  protected notificationService = inject(NotificationService);
  
  /** Signal representing the loading state of the primary service operation. */
  public readonly isLoading = signal<boolean>(false);

  /**
   * Centralized error handler that notifies the user and optionally returns a default value.
   * @param operation The name of the operation that failed.
   * @param result Optional default value to return instead of throwing.
   */
  protected handleError<T>(operation = 'Operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      let message: string;
      if (error.error instanceof ErrorEvent) {
        message = `Client_Error: ${error.error.message}`;
      } else if (error.error?.message) {
        message = error.error.message;
      } else {
        message = `Server_Fault [${error.status}]: ${error.message}`;
      }

      this.notificationService.error(`${operation.toUpperCase()}_FAILURE: ${message}`);

      if (result !== undefined) {
        return of(result as T);
      }
      return throwError(() => error);
    };
  }

  /**
   * Wraps an observable with automatic loading state management.
   */
  protected withLoading<T>(obs$: Observable<T>): Observable<T> {
    this.isLoading.set(true);
    return obs$.pipe(
      catchError(err => {
        this.isLoading.set(false);
        throw err;
      }),
      (source) => new Observable<T>(observer => {
        const subscription = source.subscribe({
          next: v => observer.next(v),
          error: e => {
            this.isLoading.set(false);
            observer.error(e);
          },
          complete: () => {
            this.isLoading.set(false);
            observer.complete();
          }
        });
        return () => subscription.unsubscribe();
      })
    );
  }
}
