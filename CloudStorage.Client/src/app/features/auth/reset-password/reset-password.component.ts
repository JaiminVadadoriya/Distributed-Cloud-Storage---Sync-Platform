import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="backdrop-blur-xl bg-white/10 dark:bg-black/20 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/10 relative z-10">
      <h2 class="text-3xl font-bold mb-4 text-center text-white drop-shadow-md">Choose New Password</h2>
      <p class="text-slate-300 text-center mb-8 text-sm">Please enter a strong password you haven't used before.</p>
      
      @if (successMessage) {
        <div class="p-6 rounded-2xl bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 backdrop-blur-sm text-center animate-fade-in-up">
           <div class="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
           </div>
           <h3 class="font-bold text-white mb-2">Success!</h3>
           <p class="text-sm">Your password has been reset successfully.</p>
           <a routerLink="/auth/login" class="mt-6 inline-block py-2.5 px-6 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-400 transition-colors text-sm">Sign In Now</a>
        </div>
      } @else if (error) {
        <div class="p-6 rounded-2xl bg-rose-500/10 text-rose-100 border border-rose-500/20 backdrop-blur-sm text-center animate-fade-in-up">
           <div class="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
           </div>
           <h3 class="font-bold text-white mb-2">Oops! Something went wrong</h3>
           <p class="text-sm mb-6 text-rose-200/80">{{ error }}</p>

           <a routerLink="/auth/forgot-password" class="inline-block py-3 px-6 rounded-xl bg-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/30 border border-rose-500/30 transition-colors text-sm">Request New Link</a>
           
           <div class="mt-4">
               <a routerLink="/auth/login" class="text-sm text-slate-400 hover:text-white transition-colors">Back to login</a>
           </div>
        </div>
      } @else {
        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="group">
            <label for="password" class="block text-sm font-semibold mb-1.5 text-slate-200 transition-colors group-focus-within:text-cyan-300">New Password</label>
            <div class="relative">
              <input id="password" type="password" formControlName="password" class="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all duration-300 backdrop-blur-sm" placeholder="At least 6 characters">
            </div>
            @if (resetForm.get('password')?.touched && resetForm.get('password')?.invalid) {
              <div class="text-rose-400 text-xs mt-1.5 font-medium animate-pulse">
                Password must be at least 6 characters
              </div>
            }
          </div>

          <div class="group">
            <label for="confirmPassword" class="block text-sm font-semibold mb-1.5 text-slate-200 transition-colors group-focus-within:text-cyan-300">Confirm Password</label>
            <div class="relative">
              <input id="confirmPassword" type="password" formControlName="confirmPassword" class="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all duration-300 backdrop-blur-sm" placeholder="Re-enter your new password">
            </div>
            @if (resetForm.get('confirmPassword')?.touched && resetForm.get('confirmPassword')?.invalid) {
              <div class="text-rose-400 text-xs mt-1.5 font-medium animate-pulse">
                Confirm password is required
              </div>
            }
            @if (resetForm.touched && resetForm.errors?.['mismatch']) {
              <div class="text-rose-400 text-xs mt-1.5 font-medium animate-pulse">
                Passwords do not match
              </div>
            }
          </div>

          <button type="submit" [disabled]="resetForm.invalid || isLoading || !token" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden">
            <span class="relative z-10 flex items-center justify-center gap-2">
              @if (isLoading) {
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing your request...
              } @else {
                Update Password
              }
            </span>
            <div class="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
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

  passwordMatchValidator(g: any) {
    const password = g.get('password').value;
    const confirm = g.get('confirmPassword').value;
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
        error: (err) => {
          this.isLoading = false;
          this.error = this.extractErrorMessage(err) || 'Failed to reset password. The link may have expired.';
        }
      });
    }
  }

  private extractErrorMessage(err: any): string | null {
    if (!err || !err.error) return null;
    if (typeof err.error === 'object' && err.error.message) return err.error.message;
    if (typeof err.error === 'string') return err.error;
    return null;
  }
}
