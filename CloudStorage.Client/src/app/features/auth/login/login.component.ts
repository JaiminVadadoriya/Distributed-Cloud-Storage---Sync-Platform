import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="bg-editorial-bg border border-editorial-text p-12 relative z-10 transition-none rounded-none">
      <h2 class="text-4xl font-bold mb-12 text-editorial-text font-sans tracking-tighter">Sign In</h2>
      
      @if (error) {
        <div class="mb-10 p-6 border border-rose-500/20 bg-rose-500/[0.02] text-rose-500 text-[10px] font-mono font-bold uppercase tracking-[0.2em] leading-relaxed">
          {{ error }}
        </div>
      }

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-8">
        <div class="relative group">
          <label for="identifier" class="block text-[10px] font-mono uppercase tracking-[0.2em] mb-1 text-editorial-text/70">Email / Username</label>
          <input id="identifier" type="text" formControlName="identifier" class="w-full py-2 bg-transparent border-b border-editorial-text/20 text-editorial-text font-mono text-sm focus:border-editorial-text outline-none transition-all placeholder:text-editorial-text/50" [attr.placeholder]="'identity@domain.com'">
          @if (loginForm.get('identifier')?.touched && loginForm.get('identifier')?.invalid) {
            <div class="text-rose-600 text-[10px] font-mono mt-1 uppercase tracking-wider">Required</div>
          }
        </div>
        
        <div class="relative group">
          <label for="password" class="block text-[10px] font-mono uppercase tracking-[0.2em] mb-1 text-editorial-text/70">Password</label>
          <input id="password" type="password" formControlName="password" class="w-full py-2 bg-transparent border-b border-editorial-text/20 text-editorial-text font-mono text-sm focus:border-editorial-text outline-none transition-all placeholder:text-editorial-text/50" [attr.placeholder]="'••••••••'">
          @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
            <div class="text-rose-600 text-[10px] font-mono mt-1 uppercase tracking-wider">Required</div>
          }
        </div>

        <div class="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest mt-8">
           <label for="remember" class="flex items-center gap-3 cursor-pointer group text-editorial-text/80 hover:text-editorial-text transition-colors">
              <input id="remember" type="checkbox" class="w-3 h-3 rounded-sm border-editorial-text/30 bg-transparent text-editorial-text focus:ring-0 cursor-pointer">
              <span>Remember</span>
           </label>
           <a routerLink="/auth/forgot-password" class="text-editorial-text/80 hover:text-editorial-text transition-colors">Recovery</a>
        </div>

        <button type="submit" [disabled]="loginForm.invalid || isLoading" 
                class="w-full py-4 mt-8 bg-editorial-text text-editorial-bg font-mono text-[10px] tracking-[0.3em] uppercase transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed font-bold">
          @if (isLoading) {
            <span class="flex items-center justify-center gap-3">
              <span class="w-1.5 h-1.5 bg-editorial-bg animate-pulse"></span>
              AUTHENTICATING
            </span>
          } @else {
            ENTER SYSTEM
          }
        </button>
      </form>
      
      <p class="mt-12 text-center font-mono text-[10px] tracking-[0.15em] text-editorial-text/70 uppercase">
        New here? 
        <a routerLink="/auth/register" class="text-editorial-text font-bold hover:underline ml-2">Register Identity</a>
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
  error: string | null = null;


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
          this.error = err.error?.message || 'Login failed. Please try again.';
          this.cdr.detectChanges(); // Force UI update just in case RxJS loses Zone context here
        }
      });
    }
  }
}
