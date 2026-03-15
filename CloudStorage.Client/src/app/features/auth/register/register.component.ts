import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="backdrop-blur-xl bg-white/10 dark:bg-black/20 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/10 relative z-10">
      <h2 class="text-3xl font-bold mb-8 text-center text-white drop-shadow-md">Create Account</h2>
      
      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
        <div class="group">
          <label for="username" class="block text-sm font-semibold mb-1.5 text-slate-200 transition-colors group-focus-within:text-cyan-300">Username</label>
          <div class="relative">
            <input id="username" type="text" formControlName="username" class="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all duration-300 backdrop-blur-sm" [attr.placeholder]="'Pick a username'">
          </div>
          @if (registerForm.get('username')?.touched && registerForm.get('username')?.invalid) {
            <div class="text-rose-400 text-xs mt-1.5 font-medium animate-pulse">
              Username is required
            </div>
          }
        </div>

        <div class="group">
          <label for="email" class="block text-sm font-semibold mb-1.5 text-slate-200 transition-colors group-focus-within:text-cyan-300">Email Address</label>
          <div class="relative">
            <input id="email" type="email" formControlName="email" class="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all duration-300 backdrop-blur-sm" [attr.placeholder]="'Enter your email address'">
          </div>
          @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
            <div class="text-rose-400 text-xs mt-1.5 font-medium animate-pulse">
              Valid email is required
            </div>
          }
        </div>
        
        <div class="group">
          <label for="password" class="block text-sm font-semibold mb-1.5 text-slate-200 transition-colors group-focus-within:text-cyan-300">Password</label>
          <div class="relative">
            <input id="password" type="password" formControlName="password" class="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition-all duration-300 backdrop-blur-sm" [attr.placeholder]="'Create a strong password'">
          </div>
          @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
            <div class="text-rose-400 text-xs mt-1.5 font-medium animate-pulse">
              Password (min 6 chars) is required
            </div>
          }
        </div>

        @if (error) {
          <div class="p-4 rounded-xl bg-rose-500/20 text-rose-200 text-sm border border-rose-500/30 backdrop-blur-sm animate-fade-in-up mt-6">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
              <span>{{ error }}</span>
            </div>
          </div>
        }

        <button type="submit" [disabled]="registerForm.invalid || isLoading" class="w-full py-3.5 mt-6 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 relative overflow-hidden group">
          <span class="relative z-10 flex items-center justify-center gap-2">
            @if (isLoading) {
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Account...
            } @else {
              Get Started
            }
          </span>
          <div class="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
        </button>
      </form>
      
      <p class="mt-8 text-center text-sm text-slate-300">
        Already have an account? 
        <a routerLink="/auth/login" class="text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition-colors ml-1">Sign in</a>
      </p>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = false;
  error = '';

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.error = '';
      
      const { username, email, password } = this.registerForm.value;
      
      this.authService.register({ username: username!, email: email!, password: password! }).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.error = this.extractErrorMessage(err) || 'Registration failed. Please try again.';
        }
      });
    }
  }

  private extractErrorMessage(err: any): string | null {
    if (!err || !err.error) return null;
    
    // Check for our custom { message: '...' } format
    if (typeof err.error === 'object' && err.error.message) {
      return err.error.message;
    }
    
    // Check for ASP.NET Core ValidationProblemDetails
    if (typeof err.error === 'object' && err.error.errors) {
      const firstKey = Object.keys(err.error.errors)[0];
      if (firstKey && err.error.errors[firstKey].length > 0) {
        return err.error.errors[firstKey][0];
      }
    }
    
    // Check for standard ASP.NET Core ProblemDetails title
    if (typeof err.error === 'object' && err.error.title) {
      return err.error.title;
    }
    
    // If the error string itself was returned
    if (typeof err.error === 'string') {
      return err.error;
    }
    
    return null;
  }
}
