import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Abstract Base Component for all Angular components in the project.
 * Handles automatic subscription cleanup and provides common UI state signals.
 */
@Component({
  template: '',
  standalone: true
})
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
   */
  protected async safeExecute(action: () => Promise<void>): Promise<void> {
    try {
      this.isBusy.set(true);
      this.errorMessage.set(null);
      await action();
    } catch (err: any) {
      console.error('Component execution error:', err);
      this.errorMessage.set(err.message || 'An unexpected error occurred in the view boundary.');
    } finally {
      this.isBusy.set(false);
    }
  }
}
