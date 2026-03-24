import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-session-expired',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isVisible()) {
      <div class="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-editorial-text/30 backdrop-blur-sm">
        <div class="bg-editorial-bg border-2 border-editorial-text p-12 w-full max-w-md rounded-none">
          <div class="space-y-8">
            <div class="text-center space-y-3">
              <div class="w-14 h-14 border border-editorial-text/20 mx-auto flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-editorial-text/60">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h2 class="text-xl font-mono font-bold uppercase tracking-[0.3em] text-editorial-text">Session_Expired</h2>
              <p class="text-[9px] font-mono uppercase tracking-widest text-editorial-text/50">Re-authenticate to continue</p>
            </div>

            <div class="space-y-6">
              <div class="space-y-2">
                <label class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Email</label>
                <input type="email" [(ngModel)]="email"
                  class="w-full px-0 py-3 bg-transparent border-b border-editorial-text/20 focus:border-editorial-text outline-none font-mono text-[11px] text-editorial-text placeholder:text-editorial-text/30"
                  placeholder="Enter_Email">
              </div>
              <div class="space-y-2">
                <label class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Password</label>
                <input type="password" [(ngModel)]="password"
                  class="w-full px-0 py-3 bg-transparent border-b border-editorial-text/20 focus:border-editorial-text outline-none font-mono text-[11px] text-editorial-text placeholder:text-editorial-text/30"
                  placeholder="Enter_Password">
              </div>
            </div>

            <button (click)="onReauth()" [disabled]="isLoading()"
              class="w-full py-4 bg-editorial-text text-editorial-bg font-mono text-[10px] uppercase tracking-[0.3em] font-bold hover:opacity-90 disabled:opacity-50 transition-all">
              {{ isLoading() ? 'Authenticating...' : 'Re-Authenticate' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class SessionExpiredComponent {
  private authService = inject(AuthService);
  private notify = inject(NotificationService);

  isVisible = signal(false);
  isLoading = signal(false);
  email = '';
  password = '';

  show(): void {
    this.isVisible.set(true);
  }

  hide(): void {
    this.isVisible.set(false);
    this.email = '';
    this.password = '';
  }

  onReauth(): void {
    if (!this.email || !this.password) return;
    this.isLoading.set(true);
    this.authService.login({ identifier: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.hide();
        this.notify.success('Session restored');
      },
      error: () => {
        this.isLoading.set(false);
        this.notify.error('Re-authentication failed');
      }
    });
  }
}
