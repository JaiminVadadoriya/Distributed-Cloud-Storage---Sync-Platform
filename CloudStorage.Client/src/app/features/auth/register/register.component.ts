import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="bg-editorial-bg border border-editorial-text p-12 relative z-10 transition-none rounded-none">
      <h2 class="text-4xl font-bold mb-12 text-editorial-text font-sans tracking-tighter">Register</h2>
      
      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-8">
        <div class="relative group">
          <label for="username" class="block text-[10px] font-mono uppercase tracking-[0.2em] mb-1 text-editorial-text/70">Username</label>
          <input id="username" type="text" formControlName="username" class="w-full py-2 bg-transparent border-b border-editorial-text/20 text-editorial-text font-mono text-sm focus:border-editorial-text outline-none transition-all placeholder:text-editorial-text/50" [attr.placeholder]="'username_01'">
          @if (registerForm.get('username')?.touched && registerForm.get('username')?.invalid) {
            <div class="text-rose-600 text-[10px] font-mono mt-1 uppercase tracking-wider">Required</div>
          }
        </div>

        <div class="relative group">
          <label for="email" class="block text-[10px] font-mono uppercase tracking-[0.2em] mb-1 text-editorial-text/70">Email Address</label>
          <input id="email" type="email" formControlName="email" class="w-full py-2 bg-transparent border-b border-editorial-text/20 text-editorial-text font-mono text-sm focus:border-editorial-text outline-none transition-all placeholder:text-editorial-text/50" [attr.placeholder]="'identity@domain.com'">
          @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
            <div class="text-rose-600 text-[10px] font-mono mt-1 uppercase tracking-wider">Valid email required</div>
          }
        </div>
        
        <div class="relative group">
          <label for="password" class="block text-[10px] font-mono uppercase tracking-[0.2em] mb-1 text-editorial-text/70">Password</label>
          <input id="password" type="password" formControlName="password" class="w-full py-2 bg-transparent border-b border-editorial-text/20 text-editorial-text font-mono text-sm focus:border-editorial-text outline-none transition-all placeholder:text-editorial-text/50" [attr.placeholder]="'••••••••'">
          @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
            <div class="text-rose-600 text-[10px] font-mono mt-1 uppercase tracking-wider">Min 6 characters</div>
          }
        </div>

        @if (error) {
          <div class="mb-10 p-6 border border-rose-500/20 bg-rose-500/[0.02] text-rose-500 text-[10px] font-mono font-bold uppercase tracking-[0.2em] leading-relaxed">
            {{ error }}
          </div>
        }

        <button type="submit" [disabled]="registerForm.invalid || isLoading" 
                class="w-full py-4 mt-8 bg-editorial-text text-editorial-bg font-mono text-[10px] tracking-[0.3em] uppercase transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed font-bold">
          @if (isLoading) {
            <span class="flex items-center justify-center gap-3">
              <span class="w-1.5 h-1.5 bg-editorial-bg animate-pulse"></span>
              CREATING IDENTITY
            </span>
          } @else {
            INITIALIZE ACCOUNT
          }
        </button>
      </form>
      
      <p class="mt-12 text-center font-mono text-[10px] tracking-[0.15em] text-editorial-text/70 uppercase">
        Have an account? 
        <a routerLink="/auth/login" class="text-editorial-text font-bold hover:underline ml-2">Sign In</a>
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
