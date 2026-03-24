import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="bg-editorial-bg border border-editorial-text p-12 relative z-10 transition-none rounded-none">
      <h2 class="text-4xl font-bold mb-6 text-editorial-text font-sans tracking-tighter text-center">Recovery</h2>
      <p class="text-editorial-text/40 font-mono text-center mb-12 text-[10px] uppercase tracking-widest leading-relaxed">Enter credentials to initialize recovery sequence.</p>
      
      @if (isSubmitted) {
        <div class="p-8 bg-editorial-text text-editorial-bg font-mono text-center">
           <h3 class="font-bold text-xs mb-4 tracking-widest uppercase items-center flex justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              SEQUENCE INITIATED
           </h3>
           <p class="text-[10px] tracking-wider leading-relaxed opacity-60">Verification link transmitted to registered identity <span class="opacity-100 font-bold underline">{{ email }}</span>.</p>
           <button (click)="isSubmitted = false" class="mt-8 text-[10px] font-bold underline uppercase tracking-widest hover:opacity-70 transition-opacity">Abort & Retry</button>
        </div>
        
        <p class="mt-12 text-center">
           <a routerLink="/auth/login" class="text-editorial-text/60 font-mono text-[10px] uppercase tracking-widest hover:text-editorial-text transition-colors inline-flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Return Home
           </a>
        </p>
      } @else {
        <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="space-y-10">
          <div class="relative group">
            <label for="email" class="block text-[10px] font-mono uppercase tracking-[0.2em] mb-1 text-editorial-text/50">Identified Email</label>
            <input id="email" type="email" formControlName="email" class="w-full py-2 bg-transparent border-b border-editorial-text/10 text-editorial-text font-mono text-sm focus:border-editorial-text outline-none transition-all placeholder:text-editorial-text/20" placeholder="identity@domain.com">
            @if (forgotForm.get('email')?.touched && forgotForm.get('email')?.invalid) {
              <div class="text-rose-600 text-[10px] font-mono mt-1 uppercase tracking-wider">Invalid identifier</div>
            }
          </div>

          @if (error) {
            <div class="p-6 border border-rose-500/20 bg-rose-500/[0.02] text-rose-500 text-[10px] font-mono font-bold uppercase tracking-[0.2em] leading-relaxed">
               {{ error }}
            </div>
          }

          <button type="submit" [disabled]="forgotForm.invalid || isLoading" class="w-full py-4 bg-editorial-text text-editorial-bg font-mono text-[11px] tracking-[0.25em] uppercase hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-20 disabled:cursor-not-allowed">
            @if (isLoading) {
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                TRANSMITTING...
              </span>
            } @else {
              INITIATE RECOVERY
            }
          </button>
        </form>
 
        <p class="mt-12 text-center font-mono text-[10px] tracking-[0.15em] text-editorial-text/40 uppercase">
          Recall Credentials? 
          <a routerLink="/auth/login" class="text-editorial-text font-bold hover:underline ml-2">Sign In</a>
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
