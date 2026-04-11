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
    <div class="bg-editorial-bg border-4 border-editorial-text p-6 md:p-14 relative z-10 transition-none rounded-none shadow-brutalist animate-in-up overflow-hidden group/card">
      <!-- Subtle internal technical pattern -->
      <div class="absolute inset-0 tech-grid pointer-events-none opacity-[0.03]"></div>
      
      <div class="flex flex-col md:flex-row items-start md:items-baseline justify-between mb-12 md:mb-16 gap-6 px-2 relative z-10">
        <h2 class="text-4xl md:text-6xl font-sans font-black text-editorial-text tracking-[-0.05em] uppercase italic leading-none">Sign_In</h2>
        <div class="flex flex-col items-start md:items-end opacity-40">
          <span class="font-mono text-[9px] uppercase tracking-[0.4em] font-bold">Protocol_v2.1</span>
          <span class="font-mono text-[8px] uppercase tracking-[0.2em]">AUTH_CORE_STABLE</span>
        </div>
      </div>
      
      @if (error) {
        <div role="alert" class="mb-10 p-6 border-l-8 border-rose-500 bg-rose-500/[0.04] text-rose-600 text-[10px] font-mono font-black uppercase tracking-[0.3em] leading-relaxed relative z-10">
           <div class="flex items-center gap-6">
              <div class="w-1.5 h-1.5 bg-rose-500 animate-pulse"></div>
              <span>System_Fault: {{ error }}</span>
           </div>
        </div>
      }

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-12 relative z-10" aria-label="Login Form">
        <!-- 01_Entity_Identity -->
        <div class="relative group/field">
          <div class="flex items-center justify-between mb-4 px-2">
            <label for="identifier" class="text-[10px] font-mono uppercase tracking-[0.5em] text-editorial-text/30 group-focus-within/field:text-editorial-text transition-colors font-black">01_Entity_Identity</label>
            <span class="text-[8px] font-mono text-editorial-text/10 font-bold hidden sm:inline">REQUIRED_FIELD</span>
          </div>
          
          <div class="flex items-stretch border-2 border-editorial-text/10 group-focus-within/field:border-editorial-text transition-colors p-0.5 sm:p-1 bg-transparent">
            <div class="w-12 flex items-center justify-center font-mono text-[10px] text-editorial-text/20 group-focus-within/field:text-editorial-text font-bold bg-editorial-text/5">
               [01]
            </div>
            <input id="identifier" 
                   type="text" 
                   formControlName="identifier" 
                   data-testid="login-identifier"
                   aria-label="User Identifier (Email or Username)"
                   required
                   class="flex-1 h-12 px-4 bg-transparent text-editorial-text font-sans text-lg font-black focus:bg-editorial-text/[0.01] outline-none transition-all placeholder:text-editorial-text/5 tracking-tight" 
                   [attr.placeholder]="'IDENTITY@HOST'">
          </div>
          
          @if (loginForm.get('identifier')?.touched && loginForm.get('identifier')?.invalid) {
            <div class="absolute right-0 -bottom-6 text-rose-600 text-[8px] font-mono uppercase tracking-[0.3em] font-black animate-in-fade">!_FIELD_REQUIRED</div>
          }
        </div>
        
        <!-- 02_Security_Phrase -->
        <div class="relative group/field">
          <div class="flex items-center justify-between mb-4 px-2">
            <label for="password" class="text-[10px] font-mono uppercase tracking-[0.5em] text-editorial-text/30 group-focus-within/field:text-editorial-text transition-colors font-black">02_Security_Phrase</label>
            <span class="text-[8px] font-mono text-editorial-text/10 font-bold hidden sm:inline">CRYPT_ACTIVE</span>
          </div>
          
          <div class="flex items-stretch border-2 border-editorial-text/10 group-focus-within/field:border-editorial-text transition-colors p-0.5 sm:p-1 bg-transparent">
            <div class="w-12 flex items-center justify-center font-mono text-[10px] text-editorial-text/20 group-focus-within/field:text-editorial-text font-bold bg-editorial-text/5">
               [02]
            </div>
            <input id="password" 
                   type="password" 
                   formControlName="password" 
                   data-testid="login-password"
                   aria-label="Security Phrase (Password)"
                   required
                   class="flex-1 h-12 px-4 bg-transparent text-editorial-text font-sans text-lg font-black focus:bg-editorial-text/[0.01] outline-none transition-all placeholder:text-editorial-text/5 tracking-widest" 
                   [attr.placeholder]="'••••••••••••'">
          </div>
          
          @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
            <div class="absolute right-0 -bottom-6 text-rose-600 text-[8px] font-mono uppercase tracking-[0.3em] font-black animate-in-fade">!_SEQUENCE_MISMATCH</div>
          }
        </div>

        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-0 font-mono text-[10px] uppercase tracking-[0.4em] px-2 pt-4">
           <label for="remember" class="flex items-center gap-5 cursor-pointer group/check text-editorial-text/40 hover:text-editorial-text transition-colors">
              <div class="relative w-5 h-5 flex items-center justify-center border-2 border-current transition-transform active:scale-90">
                 <input id="remember" type="checkbox" class="peer absolute inset-0 opacity-0 cursor-pointer">
                 <div class="w-2.5 h-2.5 bg-editorial-text scale-0 peer-checked:rotate-45 peer-checked:scale-100 transition-all duration-300"></div>
              </div>
              <span class="font-black">Sync_Session</span>
           </label>
           <a routerLink="/auth/forgot-password" class="text-editorial-text/40 hover:text-editorial-text hover:underline underline-offset-[12px] decoration-2 transition-all font-bold">Recovery_Key</a>
        </div>

        <button type="submit" 
                [disabled]="loginForm.invalid || isLoading" 
                data-testid="login-submit"
                class="relative h-[80px] w-full bg-editorial-text text-editorial-bg font-mono text-xs tracking-[0.6em] uppercase transition-all hover:bg-black active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden border-none shadow-brutalist">
          <div class="relative z-10 flex items-center justify-center gap-6">
            @if (isLoading) {
              <div class="flex items-center gap-4">
                 <span class="font-black">Verifying...</span>
              </div>
            } @else {
              <span class="font-black group-hover:tracking-[0.8em] transition-all duration-700">Authorize_Access</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" class="group-hover:translate-x-3 transition-transform duration-700">
                <line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            }
          </div>
          <!-- Shimmer overlay on hover -->
          <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]"></div>
        </button>
      </form>
      
      <div class="mt-24 pt-12 border-t-2 border-editorial-text/5 flex flex-col gap-10 relative z-10">
        <p class="font-mono text-[10px] tracking-[0.3em] text-editorial-text/20 uppercase flex flex-col items-center justify-center gap-6">
          <span>Unregistered_Entity?</span> 
          <a routerLink="/auth/register" class="text-editorial-text font-black hover:tracking-[0.5em] transition-all px-8 py-2 border-2 border-editorial-text/10 hover:border-editorial-text">Provision_Identity</a>
        </p>

        <!-- [DEV_ONLY] Administrative Shortcut -->
        <div class="pt-10 border-t border-editorial-text/5 text-center">
          <button (click)="loginAsAdmin()" 
                  class="font-mono text-[8px] uppercase tracking-[0.5em] text-amber-500/30 hover:text-amber-500 transition-all border border-amber-500/10 hover:border-amber-500/50 px-6 py-3">
             [Administrative_Access_Sequence]
          </button>
        </div>
      </div>
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

  loginAsAdmin() {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.authService.login({ identifier: 'admin@cloud.io', password: 'admin123' }).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: () => {
        this.isLoading = false;
        this.error = 'Administrative initialization failed.';
        this.cdr.detectChanges();
      }
    });
  }
}
