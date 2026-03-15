import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastNotification } from '../../core/notification.service';
import { Subscription } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <div *ngFor="let toast of toasts" 
           [@toastAnimation]
           class="pointer-events-auto w-[350px] p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] backdrop-blur-xl border flex items-start gap-4 transition-all duration-300 relative overflow-hidden group"
           [ngClass]="{
             'bg-emerald-500/10 border-emerald-500/20 text-emerald-100': toast.type === 'success',
             'bg-rose-500/10 border-rose-500/20 text-rose-100': toast.type === 'error',
             'bg-cyan-500/10 border-cyan-500/20 text-cyan-100': toast.type === 'info',
             'bg-amber-500/10 border-amber-500/20 text-amber-100': toast.type === 'warning'
           }">
        
        <!-- Animated Background Glow -->
        <div class="absolute -inset-2 opacity-50 blur-xl pointer-events-none transition-opacity duration-500"
             [ngClass]="{
               'bg-emerald-500/20': toast.type === 'success',
               'bg-rose-500/20': toast.type === 'error',
               'bg-cyan-500/20': toast.type === 'info',
               'bg-amber-500/20': toast.type === 'warning'
             }"></div>

        <!-- Dynamic Icon -->
        <div class="relative z-10 flex-shrink-0 mt-0.5" [ngSwitch]="toast.type">
          <!-- Success -->
          <svg *ngSwitchCase="'success'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <!-- Error -->
          <svg *ngSwitchCase="'error'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <!-- Warning -->
          <svg *ngSwitchCase="'warning'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <!-- Info -->
          <svg *ngSwitchDefault xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div class="relative z-10 flex-1">
          <p class="text-sm font-medium leading-relaxed">{{ toast.message }}</p>
        </div>

        <button (click)="remove(toast.id)" class="relative z-10 flex-shrink-0 text-white/50 hover:text-white transition-colors p-1 -mr-2 -mt-1 rounded-lg hover:bg-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  `,
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  toasts: ToastNotification[] = [];
  private subscription?: Subscription;
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.subscription = this.notificationService.notifications$.subscribe(notification => {
      // Re-assign array to trigger clear databinding changes
      this.toasts = [...this.toasts, notification];
      this.cdr.detectChanges();
      
      // Auto-remove after 5 seconds
      setTimeout(() => this.remove(notification.id), 5000);
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.cdr.detectChanges();
  }
}
