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
    <div class="fixed top-8 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div animate.enter="animate-enter-slide"
             animate.leave="animate-leave-fade"
             class="pointer-events-auto w-[400px] border-2 border-editorial-text p-6 bg-editorial-bg relative overflow-hidden group selection:bg-editorial-text selection:text-editorial-bg">
          
          <div class="grain-overlay pointer-events-none opacity-[0.02]"></div>

          <div class="flex items-start gap-6 relative z-10">
            <div class="w-1 h-8 flex-shrink-0 mt-1"
                 [ngClass]="{
                   'bg-editorial-text': toast.type === 'success',
                   'bg-rose-500': toast.type === 'error',
                   'bg-editorial-text/40': toast.type === 'info',
                   'bg-amber-400': toast.type === 'warning'
                 }"></div>

            <div class="flex-1 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-mono font-bold uppercase tracking-[0.3em]"
                      [ngClass]="{
                        'text-editorial-text': toast.type === 'success',
                        'text-rose-500': toast.type === 'error',
                        'text-editorial-text/40': toast.type === 'info',
                        'text-amber-500': toast.type === 'warning'
                      }">
                  {{ toast.type }}_LOG_EVENT
                </span>
                <button (click)="notificationService.removeToast(toast.id)" class="text-editorial-text/20 hover:text-editorial-text transition-none p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p class="text-[11px] font-mono font-bold uppercase tracking-widest text-editorial-text leading-tight">{{ toast.message }}</p>
            </div>
          </div>

          <div class="absolute bottom-0 left-0 h-[10px] bg-editorial-text opacity-[0.03] w-full"></div>
        </div>
      }
    </div>
  `,
  styles: [``],
  host: {
    class: 'block'
  }
})
export class NotificationToastComponent extends BaseComponent {
  public notificationService = inject(NotificationService);
}
