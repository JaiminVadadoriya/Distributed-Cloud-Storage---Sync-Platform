import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="bg-surface-50 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5">
      <h2 class="text-2xl font-bold mb-6 text-center">Welcome Back</h2>
      
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label for="identifier" class="block text-sm font-medium mb-1 text-text-muted">Email or Username</label>
          <input id="identifier" type="text" formControlName="identifier" class="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" [attr.placeholder]="'Enter your email or username'">
          @if (loginForm.get('identifier')?.touched && loginForm.get('identifier')?.invalid) {
            <div class="text-red-500 text-xs mt-1">
              Email or username is required
            </div>
          }
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium mb-1 text-text-muted">Password</label>
          <input id="password" type="password" formControlName="password" class="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
          @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
            <div class="text-red-500 text-xs mt-1">
              Password is required
            </div>
          }
        </div>

        <div class="flex items-center justify-between text-sm">
           <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" class="rounded border-gray-300 text-primary focus:ring-primary">
              <span class="text-text-muted">Remember me</span>
           </label>
           <a href="#" class="text-primary hover:underline font-medium">Forgot password?</a>
        </div>
        
        @if (error) {
          <div class="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
            {{ error }}
          </div>
        }

        <button type="submit" [disabled]="loginForm.invalid || isLoading" class="w-full py-3 rounded-xl bg-primary text-primary-content font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
          {{ isLoading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
      
      <p class="mt-6 text-center text-sm text-text-muted">
        Don't have an account? 
        <a routerLink="/auth/register" class="text-primary font-bold hover:underline">Create account</a>
      </p>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required]
  });

  isLoading = false;
  error = '';

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.error = '';
      
      const { identifier, password } = this.loginForm.value;
      
      this.authService.login({ identifier: identifier!, password: password! }).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.error = err.error?.message || 'Invalid credentials. Please try again.';
        }
      });
    }
  }
}
