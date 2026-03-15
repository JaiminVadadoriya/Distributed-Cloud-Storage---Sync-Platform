import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="backdrop-blur-xl bg-white/10 dark:bg-black/20 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/10 relative z-10">
      <h2 class="text-3xl font-bold mb-8 text-center text-white drop-shadow-md">Welcome Back</h2>
      
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
        <div class="group">
          <label for="identifier" class="block text-sm font-semibold mb-1.5 text-slate-200 transition-colors group-focus-within:text-cyan-300">Email or Username</label>
          <div class="relative">
            <input id="identifier" type="text" formControlName="identifier" class="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all duration-300 backdrop-blur-sm" [attr.placeholder]="'Enter your email or username'">
          </div>
          @if (loginForm.get('identifier')?.touched && loginForm.get('identifier')?.invalid) {
            <div class="text-rose-400 text-xs mt-1.5 font-medium animate-pulse">
              Email or username is required
            </div>
          }
        </div>
        
        <div class="group">
          <label for="password" class="block text-sm font-semibold mb-1.5 text-slate-200 transition-colors group-focus-within:text-cyan-300">Password</label>
          <div class="relative">
            <input id="password" type="password" formControlName="password" class="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all duration-300 backdrop-blur-sm" [attr.placeholder]="'Enter your password'">
          </div>
          @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
            <div class="text-rose-400 text-xs mt-1.5 font-medium animate-pulse">
              Password is required
            </div>
          }
        </div>

        <div class="flex items-center justify-between text-sm mt-6">
           <label class="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" class="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-slate-900 transition-colors cursor-pointer">
              <span class="text-slate-300 group-hover:text-white transition-colors">Remember me</span>
           </label>
           <a routerLink="/auth/forgot-password" class="text-cyan-400 hover:text-cyan-300 hover:underline font-medium transition-colors">Forgot password?</a>
        </div>

        <button type="submit" [disabled]="loginForm.invalid || isLoading" class="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 relative overflow-hidden group">
          <span class="relative z-10 flex items-center justify-center gap-2">
            @if (isLoading) {
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            } @else {
              Sign In
            }
          </span>
          <div class="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
        </button>
      </form>
      
      <p class="mt-8 text-center text-sm text-slate-300">
        Don't have an account? 
        <a routerLink="/auth/register" class="text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition-colors ml-1">Create account</a>
      </p>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loginForm = this.fb.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required]
  });

  isLoading = false;

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.cdr.detectChanges();
      
      const { identifier, password } = this.loginForm.value;
      
      this.authService.login({ identifier: identifier!, password: password! }).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.cdr.detectChanges(); // Force UI update just in case RxJS loses Zone context here
        }
      });
    }
  }
}
