import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="backdrop-blur-xl bg-white/10 dark:bg-black/20 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/10 relative z-10">
      <h2 class="text-3xl font-bold mb-4 text-center text-white drop-shadow-md">Reset Password</h2>
      <p class="text-slate-300 text-center mb-8 text-sm">Enter your email address and we'll send you a link to reset your password.</p>
      
      @if (isSubmitted) {
        <div class="p-6 rounded-2xl bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 backdrop-blur-sm text-center animate-fade-in-up">
           <div class="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
           </div>
           <h3 class="font-bold text-white mb-2">Email Sent</h3>
           <p class="text-sm">If an account exists for <span class="text-cyan-300 font-medium">{{ email }}</span>, you will receive a password reset link shortly.</p>
           <button (click)="isSubmitted = false" class="mt-6 text-cyan-400 font-bold hover:text-cyan-300 transition-colors text-sm">Wrong email? Try again</button>
        </div>
        
        <p class="mt-8 text-center text-sm">
           <a routerLink="/auth/login" class="text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition-colors flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to login
           </a>
        </p>
      } @else {
        <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="group">
            <label for="email" class="block text-sm font-semibold mb-1.5 text-slate-200 transition-colors group-focus-within:text-cyan-300">Email Address</label>
            <div class="relative">
              <input id="email" type="email" formControlName="email" class="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all duration-300 backdrop-blur-sm" placeholder="Enter your registered email">
            </div>
            @if (forgotForm.get('email')?.touched && forgotForm.get('email')?.invalid) {
              <div class="text-rose-400 text-xs mt-1.5 font-medium animate-pulse">
                Please enter a valid email address
              </div>
            }
          </div>

          @if (error) {
            <div class="p-4 rounded-xl bg-rose-500/20 text-rose-200 text-sm border border-rose-500/30 backdrop-blur-sm animate-fade-in-up">
              {{ error }}
            </div>
          }

          <button type="submit" [disabled]="forgotForm.invalid || isLoading" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden">
            <span class="relative z-10 flex items-center justify-center gap-2">
              @if (isLoading) {
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending link...
              } @else {
                Send Reset Link
              }
            </span>
            <div class="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
          </button>
        </form>

        <p class="mt-8 text-center text-sm text-slate-300">
          Remembered your password? 
          <a routerLink="/auth/login" class="text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition-colors ml-1">Sign in</a>
        </p>
      }
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = false;
  isSubmitted = false;
  email = '';
  error = '';

  onSubmit() {
    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.error = '';
      this.email = this.forgotForm.value.email!;

      this.authService.requestPasswordReset(this.email).subscribe({
        next: () => {
          this.isLoading = false;
          this.isSubmitted = true;
        },
        error: (err) => {
          this.isLoading = false;
          this.error = 'Something went wrong. Please try again later.';
          console.error(err);
        }
      });
    }
  }
}
