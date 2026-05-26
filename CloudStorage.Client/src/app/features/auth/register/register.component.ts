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
    <div class="bg-editorial-bg border-4 border-editorial-text p-6 md:p-14 relative z-10 transition-none rounded-none shadow-brutalist animate-in-up overflow-hidden group/card text-left">
      <!-- Subtle internal technical pattern -->
      <div class="absolute inset-0 tech-grid pointer-events-none opacity-[0.03]"></div>
      
      <div class="flex flex-col md:flex-row items-start md:items-baseline justify-between mb-12 md:mb-16 gap-6 px-2 relative z-10 text-left">
        <h2 class="text-4xl md:text-6xl font-sans font-black text-editorial-text tracking-[-0.05em] uppercase italic leading-none">Register</h2>
        <div class="flex flex-col items-start md:items-end opacity-40">
          <span class="font-mono text-[9px] uppercase tracking-[0.4em] font-bold">Protocol_v2.1</span>
          <span class="font-mono text-[8px] uppercase tracking-[0.2em]">SYS_INIT_SEQUENCE</span>
        </div>
      </div>
      
      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-12 relative z-10">
        <!-- 01_Username_Alias -->
        <div class="relative group/field">
          <div class="flex items-center justify-between mb-4 px-2">
            <label for="username" class="text-[10px] font-mono uppercase tracking-[0.5em] text-editorial-text/30 group-focus-within/field:text-editorial-text transition-colors font-black">01_Username_Alias</label>
            <span class="text-[8px] font-mono text-editorial-text/10 font-bold hidden sm:inline">REQUIRED_FIELD</span>
          </div>
          
          <div class="flex items-stretch border-2 border-editorial-text/10 group-focus-within/field:border-editorial-text transition-colors p-0.5 sm:p-1 bg-transparent">
            <div class="w-12 flex items-center justify-center font-mono text-[10px] text-editorial-text/20 group-focus-within/field:text-editorial-text font-bold bg-editorial-text/5">
               [01]
            </div>
            <input id="username" 
                   type="text" 
                   formControlName="username" 
                   class="flex-1 h-12 px-4 bg-transparent text-editorial-text font-sans text-lg font-black focus:bg-editorial-text/[0.01] outline-none transition-all placeholder:text-editorial-text/5 tracking-tight" 
                   [attr.placeholder]="'USERNAME_01'">
          </div>
          
          @if (registerForm.get('username')?.touched && registerForm.get('username')?.invalid) {
            <div class="absolute right-0 -bottom-6 text-rose-600 text-[8px] font-mono uppercase tracking-[0.3em] font-black animate-in-fade">!_FIELD_REQUIRED</div>
          }
        </div>

        <!-- 02_Network_Identity -->
        <div class="relative group/field">
          <div class="flex items-center justify-between mb-4 px-2">
            <label for="email" class="text-[10px] font-mono uppercase tracking-[0.5em] text-editorial-text/30 group-focus-within/field:text-editorial-text transition-colors font-black">02_Network_Identity</label>
            <span class="text-[8px] font-mono text-editorial-text/10 font-bold hidden sm:inline">VALID_ID_REQUIRED</span>
          </div>
          
          <div class="flex items-stretch border-2 border-editorial-text/10 group-focus-within/field:border-editorial-text transition-colors p-0.5 sm:p-1 bg-transparent">
            <div class="w-12 flex items-center justify-center font-mono text-[10px] text-editorial-text/20 group-focus-within/field:text-editorial-text font-bold bg-editorial-text/5">
               [02]
            </div>
            <input id="email" 
                   type="email" 
                   formControlName="email" 
                   class="flex-1 h-12 px-4 bg-transparent text-editorial-text font-sans text-lg font-black focus:bg-editorial-text/[0.01] outline-none transition-all placeholder:text-editorial-text/5 tracking-tight" 
                   [attr.placeholder]="'IDENTITY@HOST.COM'">
          </div>
          
          @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
            <div class="absolute right-0 -bottom-6 text-rose-600 text-[8px] font-mono uppercase tracking-[0.3em] font-black animate-in-fade">!_INVALID_IDENTITY</div>
          }
        </div>
        
        <!-- 03_Security_Sequence -->
        <div class="relative group/field">
          <div class="flex items-center justify-between mb-4 px-2">
            <label for="password" class="text-[10px] font-mono uppercase tracking-[0.5em] text-editorial-text/30 group-focus-within/field:text-editorial-text transition-colors font-black">03_Security_Sequence</label>
            <span class="text-[8px] font-mono text-editorial-text/10 font-bold hidden sm:inline">MIN_6_BITS</span>
          </div>
          
          <div class="flex items-stretch border-2 border-editorial-text/10 group-focus-within/field:border-editorial-text transition-colors p-0.5 sm:p-1 bg-transparent">
            <div class="w-12 flex items-center justify-center font-mono text-[10px] text-editorial-text/20 group-focus-within/field:text-editorial-text font-bold bg-editorial-text/5">
               [03]
            </div>
            <input id="password" 
                   type="password" 
                   formControlName="password" 
                   class="flex-1 h-12 px-4 bg-transparent text-editorial-text font-sans text-lg font-black focus:bg-editorial-text/[0.01] outline-none transition-all placeholder:text-editorial-text/5 tracking-widest" 
                   [attr.placeholder]="'••••••••••••'">
          </div>
          
          @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
            <div class="absolute right-0 -bottom-6 text-rose-600 text-[8px] font-mono uppercase tracking-[0.3em] font-black animate-in-fade">!_BITS_INSUFFICIENT</div>
          }
        </div>

        @if (error) {
          <div class="mb-12 p-8 border-l-8 border-rose-500 bg-rose-500/[0.04] text-rose-600 text-[10px] font-mono font-black uppercase tracking-[0.3em] leading-relaxed relative z-10 flex items-center gap-6">
             <div class="w-1.5 h-1.5 bg-rose-500 animate-pulse"></div>
             <span>System_Fault: {{ error }}</span>
          </div>
        }

        <button type="submit" 
                [disabled]="isLoading" 
                class="relative h-[80px] w-full bg-editorial-text text-editorial-bg font-mono text-xs tracking-[0.6em] uppercase transition-all hover:bg-black active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden border-none shadow-brutalist">
          <div class="relative z-10 flex items-center justify-center gap-6">
            @if (isLoading) {
              <div class="flex items-center gap-4">
                 <span class="font-black">Provisioning...</span>
              </div>
            } @else {
              <span class="font-black group-hover:tracking-[0.8em] transition-all duration-700">Initialize_Account</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" class="group-hover:translate-x-3 transition-transform duration-700">
                <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            }
          </div>
          <!-- Shimmer overlay on hover -->
          <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]"></div>
        </button>
      </form>
      
      <div class="mt-24 pt-12 border-t-2 border-editorial-text/5 text-center relative z-10">
        <p class="font-mono text-[10px] tracking-[0.3em] text-editorial-text/20 uppercase flex flex-col items-center justify-center gap-6">
          <span>Active_Entity?</span> 
          <a routerLink="/auth/login" class="text-editorial-text font-black hover:tracking-[0.5em] transition-all px-8 py-2 border-2 border-editorial-text/10 hover:border-editorial-text">Establish_Session</a>
        </p>
      </div>
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
        error: (err: unknown) => {
          this.isLoading = false;
          this.error = this.extractErrorMessage(err) || 'Registration failed. Please try again.';
        }
      });
    }
  }

  private extractErrorMessage(err: unknown): string | null {
    const errorObj = err as { error?: { message?: string, errors?: Record<string, string[]>, title?: string } };
    if (!errorObj.error) return null;
    
    // Check for our custom { message: '...' } format
    if (typeof errorObj.error === 'object' && errorObj.error.message) {
      return errorObj.error.message;
    }
    
    // Check for ASP.NET Core ValidationProblemDetails
    if (typeof errorObj.error === 'object' && errorObj.error.errors) {
      const firstKey = Object.keys(errorObj.error.errors)[0];
      if (firstKey && errorObj.error.errors[firstKey].length > 0) {
        return errorObj.error.errors[firstKey][0];
      }
    }
    
    // Check for standard ASP.NET Core ProblemDetails title
    if (typeof errorObj.error === 'object' && errorObj.error.title) {
      return errorObj.error.title;
    }
    
    // If the error string itself was returned
    if (typeof errorObj.error === 'string') {
      return errorObj.error;
    }
    
    return null;
  }
}
