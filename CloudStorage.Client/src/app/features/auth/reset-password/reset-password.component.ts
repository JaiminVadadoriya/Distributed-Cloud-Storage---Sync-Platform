import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="bg-editorial-bg border-4 border-editorial-text p-6 md:p-14 relative z-10 transition-none rounded-none shadow-brutalist animate-in-up overflow-hidden group/card text-left">
      <!-- Subtle internal technical pattern -->
      <div class="absolute inset-0 tech-grid pointer-events-none opacity-[0.03]"></div>
      
      <div class="flex flex-col md:flex-row items-start md:items-baseline justify-between mb-12 md:mb-16 gap-6 px-2 relative z-10 text-left">
        <h2 class="text-4xl md:text-6xl font-sans font-black text-editorial-text tracking-[-0.05em] uppercase italic leading-none">Credentials</h2>
        <div class="flex flex-col items-start md:items-end opacity-40">
          <span class="font-mono text-[9px] uppercase tracking-[0.4em] font-bold">Protocol_v2.1</span>
          <span class="font-mono text-[8px] uppercase tracking-[0.2em]">ACCESS_RESTORE</span>
        </div>
      </div>
      
      @if (successMessage) {
        <div class="p-10 bg-editorial-text text-editorial-bg font-mono relative z-10 animate-in-fade shadow-brutalist">
           <div class="flex items-center gap-6 mb-8">
              <div class="w-2 h-8 bg-editorial-bg animate-pulse"></div>
              <h3 class="font-black text-sm tracking-[0.4em] uppercase">Update_Complete</h3>
           </div>
           <p class="text-[11px] tracking-[0.2em] opacity-80 leading-[2] mb-10">Identity parameters updated locally and remotely. <br>Navigating to initialization...</p>
           
           <a routerLink="/auth/login" class="inline-block px-10 py-4 bg-editorial-bg text-editorial-text font-black uppercase tracking-[0.3em] text-[10px] shadow-brutalist active:translate-y-1 transition-all">Establish_Session_Now</a>
        </div>
      } @else if (error) {
        <div class="mb-12 p-8 border-l-8 border-rose-500 bg-rose-500/[0.04] text-rose-600 text-[10px] font-mono font-black uppercase tracking-[0.3em] leading-relaxed relative z-10">
           <div class="flex items-center gap-6 mb-4">
              <div class="w-1.5 h-1.5 bg-rose-500 animate-pulse"></div>
              <span>System_Fault: {{ error }}</span>
           </div>
           <a routerLink="/auth/forgot-password" class="text-[9px] font-black underline underline-offset-8 uppercase tracking-[0.3em] hover:text-editorial-text transition-colors">Request_New_Sequence</a>
        </div>
      } @else {
        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-12 relative z-10 text-left">
          <!-- 01_New_Sequence -->
          <div class="relative group/field">
            <div class="flex items-center justify-between mb-4 px-2">
              <label for="password" class="text-[10px] font-mono uppercase tracking-[0.5em] text-editorial-text/30 group-focus-within/field:text-editorial-text transition-colors font-black">01_New_Sequence</label>
              <span class="text-[8px] font-mono text-editorial-text/10 font-bold hidden sm:inline">SECURE_BITS</span>
            </div>
            
            <div class="flex items-stretch border-2 border-editorial-text/10 group-focus-within/field:border-editorial-text transition-colors p-0.5 sm:p-1 bg-transparent">
              <div class="w-12 flex items-center justify-center font-mono text-[10px] text-editorial-text/20 group-focus-within/field:text-editorial-text font-bold bg-editorial-text/5">
                 [01]
              </div>
              <input id="password" 
                     type="password" 
                     formControlName="password" 
                     class="flex-1 h-12 px-4 bg-transparent text-editorial-text font-sans text-lg font-black focus:bg-editorial-text/[0.01] outline-none transition-all placeholder:text-editorial-text/5 tracking-widest" 
                     [attr.placeholder]="'••••••••••••'">
            </div>
            
            @if (resetForm.get('password')?.touched && resetForm.get('password')?.invalid) {
              <div class="absolute right-0 -bottom-6 text-rose-600 text-[8px] font-mono uppercase tracking-[0.3em] font-black animate-in-fade">!_BITS_INSUFFICIENT</div>
            }
          </div>

          <!-- 02_Verify_Sequence -->
          <div class="relative group/field">
            <div class="flex items-center justify-between mb-4 px-2">
              <label for="confirmPassword" class="text-[10px] font-mono uppercase tracking-[0.5em] text-editorial-text/30 group-focus-within/field:text-editorial-text transition-colors font-black">02_Verify_Sequence</label>
              <span class="text-[8px] font-mono text-editorial-text/10 font-bold hidden sm:inline">MATCH_REQUIRED</span>
            </div>
            
            <div class="flex items-stretch border-2 border-editorial-text/10 group-focus-within/field:border-editorial-text transition-colors p-0.5 sm:p-1 bg-transparent">
              <div class="w-12 flex items-center justify-center font-mono text-[10px] text-editorial-text/20 group-focus-within/field:text-editorial-text font-bold bg-editorial-text/5">
                 [02]
              </div>
              <input id="confirmPassword" 
                     type="password" 
                     formControlName="confirmPassword" 
                     class="flex-1 h-12 px-4 bg-transparent text-editorial-text font-sans text-lg font-black focus:bg-editorial-text/[0.01] outline-none transition-all placeholder:text-editorial-text/5 tracking-widest" 
                     [attr.placeholder]="'••••••••••••'">
            </div>
            
            @if (resetForm.touched && resetForm.errors?.['mismatch']) {
              <div class="absolute right-0 -bottom-6 text-rose-600 text-[8px] font-mono uppercase tracking-[0.3em] font-black animate-in-fade">!_SEQUENCE_MISMATCH</div>
            }
          </div>

          <button type="submit" 
                  [disabled]="resetForm.invalid || isLoading || !token" 
                  class="relative h-[80px] w-full bg-editorial-text text-editorial-bg font-mono text-xs tracking-[0.6em] uppercase transition-all hover:bg-black active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden border-none shadow-brutalist">
            <div class="relative z-10 flex items-center justify-center gap-6">
              @if (isLoading) {
                <div class="flex items-center gap-4">
                   <span class="font-black">Restore_Process...</span>
                </div>
              } @else {
                <span class="font-black group-hover:tracking-[0.8em] transition-all duration-700">Commit_Changes</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" class="group-hover:translate-x-3 transition-transform duration-700">
                  <path d="M20 6L9 17L4 12"></path>
                </svg>
              }
            </div>
            <!-- Shimmer overlay on hover -->
            <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]"></div>
          </button>
        </form>
      }
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = '';
  isLoading = false;
  error = '';
  successMessage = false;

  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error = 'Invalid or missing reset token. Please request a new link.';
    }
  }

  passwordMatchValidator(g: AbstractControl) {
    const password = g.get('password')?.value;
    const confirm = g.get('confirmPassword')?.value;
    return password === confirm ? null : { 'mismatch': true };
  }

  onSubmit() {
    if (this.resetForm.valid && this.token) {
      this.isLoading = true;
      this.error = '';

      this.authService.resetPassword({
        token: this.token,
        newPassword: this.resetForm.value.password!
      }).subscribe({
        next: () => {
          this.isLoading = false;
          this.successMessage = true;
          // Redirect after 2 seconds so the user can see the success message
          setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        },
        error: (err: unknown) => {
          this.isLoading = false;
          this.error = this.extractErrorMessage(err) || 'Failed to reset password. The link may have expired.';
        }
      });
    }
  }

  private extractErrorMessage(err: unknown): string | null {
    const errorObj = err as { error?: { message?: string, title?: string } };
    if (!errorObj.error) return null;
    if (typeof errorObj.error === 'object' && errorObj.error.message) return errorObj.error.message;
    if (typeof errorObj.error === 'string') return errorObj.error;
    return null;
  }
}
