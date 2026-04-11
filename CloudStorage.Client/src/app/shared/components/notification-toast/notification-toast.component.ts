import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { BaseComponent } from '../../../core/models/base-component';

/**
 * NotificationToastComponent provides real-time system feedback 
 * using a high-fidelity editorial design.
 */
@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-12 right-12 z-[100] flex flex-col gap-6 pointer-events-none" role="status" aria-live="polite">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div class="pointer-events-auto w-[420px] border-2 border-editorial-text p-8 bg-editorial-bg relative overflow-hidden shadow-brutalist animate-in-fade selection:bg-editorial-text selection:text-editorial-bg group">
          
          <div class="grain-wrapper">
            <div class="absolute inset-0 grain-overlay pointer-events-none opacity-[0.03]"></div>
          </div>

          <div class="flex items-start gap-8 relative z-10">
            <div class="w-1.5 h-10 flex-shrink-0 mt-1"
                 [ngClass]="{
                   'bg-editorial-text': toast.type === 'success',
                   'bg-rose-500': toast.type === 'error',
                   'bg-editorial-text/40': toast.type === 'info',
                   'bg-amber-400': toast.type === 'warning'
                 }"></div>

            <div class="flex-1 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-mono font-extrabold uppercase tracking-[0.4em]"
                      [ngClass]="{
                        'text-editorial-text': toast.type === 'success',
                        'text-rose-500': toast.type === 'error',
                        'text-editorial-text/40': toast.type === 'info',
                        'text-amber-500': toast.type === 'warning'
                      }">
                  SYS_EVENT: {{ toast.type }}
                </span>
                <button (click)="notificationService.removeToast(toast.id)" class="text-editorial-text/20 hover:text-editorial-text transition-all p-1 active:scale-90">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p class="text-[12px] font-sans font-bold uppercase tracking-tight text-editorial-text leading-tight">{{ toast.message }}</p>
            </div>
          </div>

          <!-- Depleting progress bar (simulated with CSS transition) -->
          <div class="absolute bottom-0 left-0 h-1.5 bg-editorial-text/10 w-full overflow-hidden">
             <div class="h-full bg-current opacity-20 animate-[loading-bar_5s_linear_infinite]"
                  [ngClass]="{
                    'text-editorial-text': toast.type === 'success',
                    'text-rose-500': toast.type === 'error',
                    'text-editorial-text/40': toast.type === 'info',
                    'text-amber-500': toast.type === 'warning'
                  }"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [``],
  host: {
    class: 'block fixed inset-0 pointer-events-none z-[200]'
  }
})
export class NotificationToastComponent extends BaseComponent {
  public notificationService = inject(NotificationService);
}
