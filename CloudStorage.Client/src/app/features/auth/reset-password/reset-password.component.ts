import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="bg-editorial-bg border border-editorial-text p-12 relative z-10 transition-none rounded-none">
      <h2 class="text-4xl font-bold mb-6 text-editorial-text font-sans tracking-tighter text-center">New Credentials</h2>
      <p class="text-editorial-text/70 font-mono text-center mb-12 text-[10px] uppercase tracking-widest leading-relaxed">Update identity access parameters.</p>
      
      @if (successMessage) {
        <div class="p-8 bg-editorial-text text-editorial-bg font-mono text-center">
           <h3 class="font-bold text-xs mb-4 tracking-widest uppercase items-center flex justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              UPDATE COMPLETE
           </h3>
           <p class="text-[10px] tracking-wider leading-relaxed opacity-60">Identity parameters updated. Redirecting to initialization.</p>
           <a routerLink="/auth/login" class="mt-8 inline-block px-8 py-3 bg-editorial-bg text-editorial-text font-bold uppercase tracking-widest text-[10px] hover:opacity-80 transition-opacity">Redirect Now</a>
        </div>
      } @else if (error) {
        <div class="mb-10 p-6 border border-rose-500/20 bg-rose-500/[0.02] text-rose-500 text-[10px] font-mono font-bold uppercase tracking-[0.2em] leading-relaxed">
           <h3 class="font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              ERROR DETECTED
           </h3>
           <p class="text-[10px] opacity-80 uppercase tracking-tight mb-6">{{ error }}</p>

           <a routerLink="/auth/forgot-password" class="text-[10px] font-bold underline uppercase tracking-widest hover:opacity-70 transition-opacity">Request New Sequence</a>
        </div>
      } @else {
        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-10">
          <div class="relative group">
            <label for="password" class="block text-[10px] font-mono uppercase tracking-[0.2em] mb-1 text-editorial-text/70">New Password</label>
            <input id="password" type="password" formControlName="password" class="w-full py-2 bg-transparent border-b border-editorial-text/20 text-editorial-text font-mono text-sm focus:border-editorial-text outline-none transition-all placeholder:text-editorial-text/50" placeholder="••••••••">
            @if (resetForm.get('password')?.touched && resetForm.get('password')?.invalid) {
              <div class="text-rose-600 text-[10px] font-mono mt-1 uppercase tracking-wider">Min 6 characters</div>
            }
          </div>

          <div class="relative group">
            <label for="confirmPassword" class="block text-[10px] font-mono uppercase tracking-[0.2em] mb-1 text-editorial-text/70">Verify Password</label>
            <input id="confirmPassword" type="password" formControlName="confirmPassword" class="w-full py-2 bg-transparent border-b border-editorial-text/20 text-editorial-text font-mono text-sm focus:border-editorial-text outline-none transition-all placeholder:text-editorial-text/50" placeholder="••••••••">
            @if (resetForm.get('confirmPassword')?.touched && resetForm.get('confirmPassword')?.invalid) {
              <div class="text-rose-600 text-[10px] font-mono mt-1 uppercase tracking-wider">Confirm required</div>
            }
            @if (resetForm.touched && resetForm.errors?.['mismatch']) {
              <div class="text-rose-600 text-[10px] font-mono mt-1 uppercase tracking-wider">Mismatch detected</div>
            }
          </div>

          <button type="submit" [disabled]="resetForm.invalid || isLoading || !token" 
                  class="w-full py-4 mt-8 bg-editorial-text text-editorial-bg font-mono text-[10px] tracking-[0.3em] uppercase transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed font-bold">
            @if (isLoading) {
              <span class="flex items-center justify-center gap-3">
                <span class="w-1.5 h-1.5 bg-editorial-bg animate-pulse"></span>
                PROCESSING
              </span>
            } @else {
              RESTORE ACCESS
            }
          </button>
        </form>
      }
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = '';
  isLoading = false;
  error = '';
  successMessage = false;

  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error = 'Invalid or missing reset token. Please request a new link.';
    }
  }

  passwordMatchValidator(g: AbstractControl) {
    const password = g.get('password')?.value;
    const confirm = g.get('confirmPassword')?.value;
    return password === confirm ? null : { 'mismatch': true };
  }

  onSubmit() {
    if (this.resetForm.valid && this.token) {
      this.isLoading = true;
      this.error = '';

      this.authService.resetPassword({
        token: this.token,
        newPassword: this.resetForm.value.password!
      }).subscribe({
        next: () => {
          this.isLoading = false;
          this.successMessage = true;
          // Redirect after 2 seconds so the user can see the success message
          setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        },
        error: (err: unknown) => {
          this.isLoading = false;
          this.error = this.extractErrorMessage(err) || 'Failed to reset password. The link may have expired.';
        }
      });
    }
  }

  private extractErrorMessage(err: unknown): string | null {
    const errorObj = err as { error?: { message?: string, title?: string } };
    if (!errorObj.error) return null;
    if (typeof errorObj.error === 'object' && errorObj.error.message) return errorObj.error.message;
    if (typeof errorObj.error === 'string') return errorObj.error;
    return null;
  }
}
