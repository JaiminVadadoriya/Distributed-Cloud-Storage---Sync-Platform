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
    <div class="bg-editorial-bg border-4 border-editorial-text p-6 md:p-14 relative z-10 transition-none rounded-none shadow-brutalist animate-in-up overflow-hidden group/card text-left">
      <!-- Subtle internal technical pattern -->
      <div class="absolute inset-0 tech-grid pointer-events-none opacity-[0.03]"></div>
      
      <div class="flex flex-col md:flex-row items-start md:items-baseline justify-between mb-12 md:mb-16 gap-6 px-2 relative z-10 text-left">
        <h2 class="text-4xl md:text-6xl font-sans font-black text-editorial-text tracking-[-0.05em] uppercase italic leading-none">Recovery</h2>
        <div class="flex flex-col items-start md:items-end opacity-40">
          <span class="font-mono text-[9px] uppercase tracking-[0.4em] font-bold">Protocol_v2.1</span>
          <span class="font-mono text-[8px] uppercase tracking-[0.2em]">SEC_REC_SEQUENCE</span>
        </div>
      </div>
      
      @if (isSubmitted) {
        <div class="p-10 bg-editorial-text text-editorial-bg font-mono relative z-10 animate-in-fade shadow-brutalist">
           <div class="flex items-center gap-6 mb-8">
              <div class="w-2 h-8 bg-editorial-bg animate-pulse"></div>
              <h3 class="font-black text-sm tracking-[0.4em] uppercase">Sequence_Initiated</h3>
           </div>
           <p class="text-[11px] tracking-[0.2em] opacity-80 leading-[2] mb-10">Verification link transmitted to registered identity: <br><span class="opacity-100 font-black text-editorial-accent uppercase bg-editorial-accent/10 px-2 py-1">{{ email }}</span></p>
           
           <div class="flex gap-8">
              <button (click)="isSubmitted = false" class="text-[9px] font-black underline underline-offset-8 uppercase tracking-[0.3em] hover:opacity-70 transition-all">Abort & Retry</button>
              <a routerLink="/auth/login" class="text-[9px] font-black underline underline-offset-8 uppercase tracking-[0.3em] hover:opacity-70 transition-all">Return_Home</a>
           </div>
        </div>
      } @else {
        <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="space-y-12 relative z-10 text-left">
          <div class="relative group/field">
            <div class="flex items-center justify-between mb-4 px-2">
              <label for="email" class="text-[10px] font-mono uppercase tracking-[0.5em] text-editorial-text/30 group-focus-within/field:text-editorial-text transition-colors font-black">01_Network_Identity</label>
              <span class="text-[8px] font-mono text-editorial-text/10 font-bold hidden sm:inline">ID_VERIFICATION</span>
            </div>
            
            <div class="flex items-stretch border-2 border-editorial-text/10 group-focus-within/field:border-editorial-text transition-colors p-0.5 sm:p-1 bg-transparent">
              <div class="w-12 flex items-center justify-center font-mono text-[10px] text-editorial-text/20 group-focus-within/field:text-editorial-text font-bold bg-editorial-text/5">
                 [01]
              </div>
              <input id="email" 
                     type="email" 
                     formControlName="email" 
                     class="flex-1 h-12 px-4 bg-transparent text-editorial-text font-sans text-lg font-black focus:bg-editorial-text/[0.01] outline-none transition-all placeholder:text-editorial-text/5 tracking-tight" 
                     [attr.placeholder]="'IDENTITY@HOST.COM'">
            </div>
            
            @if (forgotForm.get('email')?.touched && forgotForm.get('email')?.invalid) {
              <div class="absolute right-0 -bottom-6 text-rose-600 text-[8px] font-mono uppercase tracking-[0.3em] font-black animate-in-fade">!_INVALID_IDENTITY</div>
            }
          </div>

          @if (error) {
            <div class="mb-12 p-8 border-l-8 border-rose-500 bg-rose-500/[0.04] text-rose-600 text-[10px] font-mono font-black uppercase tracking-[0.3em] leading-relaxed relative z-10 flex items-center gap-6">
               <div class="w-1.5 h-1.5 bg-rose-500 animate-pulse"></div>
               <span>System_Fault: {{ error }}</span>
            </div>
          }

          <button type="submit" 
                  [disabled]="forgotForm.invalid || isLoading" 
                  class="relative h-[80px] w-full bg-editorial-text text-editorial-bg font-mono text-xs tracking-[0.6em] uppercase transition-all hover:bg-black active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden border-none shadow-brutalist">
            <div class="relative z-10 flex items-center justify-center gap-6">
              @if (isLoading) {
                <div class="flex items-center gap-4">
                   <span class="font-black">Transmitting...</span>
                </div>
              } @else {
                <span class="font-black group-hover:tracking-[0.8em] transition-all duration-700">Initiate_Recovery</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" class="group-hover:translate-x-3 transition-transform duration-700">
                  <path d="m12 19 7-7-7-7"></path><path d="M19 12H5"></path>
                </svg>
              }
            </div>
            <!-- Shimmer overlay on hover -->
            <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]"></div>
          </button>
        </form>
 
        <div class="mt-20 pt-10 border-t-2 border-editorial-text/5 text-center relative z-10">
          <p class="font-mono text-[10px] tracking-[0.3em] text-editorial-text/20 uppercase flex flex-col items-center justify-center gap-6">
            <span>Recall_Credentials?</span> 
            <a routerLink="/auth/login" class="text-editorial-text font-black hover:tracking-[0.5em] transition-all px-8 py-2 border-2 border-editorial-text/10 hover:border-editorial-text">Establish_Session</a>
          </p>
        </div>
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
        error: (err: unknown) => {
          this.isLoading = false;
          this.error = 'Something went wrong. Please try again later.';
          console.error(err);
        }
      });
    }
  }
}
