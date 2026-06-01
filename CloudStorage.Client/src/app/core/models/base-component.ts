import { Directive, OnDestroy, signal } from '@angular/core';
import { Subject, Observable, firstValueFrom } from 'rxjs';

/**
 * Abstract Base Component for all Angular components in the project.
 * Handles automatic subscription cleanup and provides common UI state signals.
 */
@Directive()
export abstract class BaseComponent implements OnDestroy {
  /** Subject that emits when the component is destroyed. Use with .pipe(takeUntil(this.destroy$)) */
  protected readonly destroy$ = new Subject<void>();
  
  /** Signal for tracking component-level loading state. */
  public readonly isBusy = signal<boolean>(false);
  
  /** Signal for holding component-level error messages. */
  public readonly errorMessage = signal<string | null>(null);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Safe execution wrapper that handles loading state and error trapping.
   * Supports Promises, Observables, and functions returning them.
   */
  protected async safeExecute<T>(
    action: Promise<T> | Observable<T> | (() => Promise<T> | Observable<T>), 
    onSuccess?: (result: T) => void
  ): Promise<void> {
    try {
      this.isBusy.set(true);
      this.errorMessage.set(null);
      
      let execution: Promise<T> | Observable<T>;
      if (typeof action === 'function') {
        execution = action();
      } else {
        execution = action;
      }
      
      const result = await (execution instanceof Observable ? firstValueFrom(execution) : execution);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      console.error('Component execution error:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred in the view boundary.';
      this.errorMessage.set(message);
    } finally {
      this.isBusy.set(false);
    }
  }
}
