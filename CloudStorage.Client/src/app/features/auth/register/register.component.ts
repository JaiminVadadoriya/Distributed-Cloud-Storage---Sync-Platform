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
    <div class="bg-surface-50 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5">
      <h2 class="text-2xl font-bold mb-6 text-center">Create Account</h2>
      
      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium mb-1 text-text-muted">Username</label>
          <input id="username" type="text" formControlName="username" class="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
          @if (registerForm.get('username')?.touched && registerForm.get('username')?.invalid) {
            <div class="text-red-500 text-xs mt-1">
              Username is required
            </div>
          }
        </div>

        <div>
          <label for="email" class="block text-sm font-medium mb-1 text-text-muted">Email Address</label>
          <input id="email" type="email" formControlName="email" class="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
          @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
            <div class="text-red-500 text-xs mt-1">
              Valid email is required
            </div>
          }
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium mb-1 text-text-muted">Password</label>
          <input id="password" type="password" formControlName="password" class="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
          @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
            <div class="text-red-500 text-xs mt-1">
              Password (min 6 chars) is required
            </div>
          }
        </div>

        @if (error) {
          <div class="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
            {{ error }}
          </div>
        }

        <button type="submit" [disabled]="registerForm.invalid || isLoading" class="w-full py-3 rounded-xl bg-secondary text-white font-bold shadow-lg shadow-secondary/25 hover:shadow-secondary/40 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
          {{ isLoading ? 'Creating Account...' : 'Get Started' }}
        </button>
      </form>
      
      <p class="mt-6 text-center text-sm text-text-muted">
        Already have an account? 
        <a routerLink="/auth/login" class="text-primary font-bold hover:underline">Sign in</a>
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
          this.error = err.error?.message || 'Registration failed. Please try again.';
        }
      });
    }
  }
}
