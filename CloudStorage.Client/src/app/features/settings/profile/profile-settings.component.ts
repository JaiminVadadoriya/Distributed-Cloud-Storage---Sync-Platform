import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BaseComponent } from '../../../core/models/base-component';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="lg:col-span-4 space-y-12">
        <div class="p-8 border border-editorial-text/20 bg-editorial-text/[0.01] space-y-6 group">
          <div class="w-12 h-12 border border-editorial-text/20 flex items-center justify-center text-editorial-text/70 group-hover:border-editorial-text transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          @if (authService.currentUser(); as user) {
            <div class="space-y-1">
              <div class="text-[10px] font-mono font-bold uppercase tracking-widest text-editorial-text">{{ user.username }}</div>
              <div class="text-[9px] font-mono uppercase tracking-tighter text-editorial-text/70">{{ user.email }}</div>
            </div>
          }
        </div>
        
        <div class="space-y-4 pt-8">
           <p class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 leading-relaxed italic">
             Identity_Bound: TRUE<br>
             Session_Node: SECURE<br>
             Protocol: OAUTH2_PKCE
           </p>
        </div>
      </div>

      <div class="lg:col-span-8 space-y-16">
        <section class="space-y-10">
          <div class="pb-4 border-b border-editorial-text/20">
            <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">01. Profile_Information</h2>
          </div>
          <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()" class="space-y-12">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div class="space-y-3">
                <label for="username" class="text-[9px] font-mono font-bold uppercase tracking-[0.2em] transition-colors"
                  [class]="profileForm.get('username')?.invalid && profileForm.get('username')?.touched ? 'text-rose-500' : 'text-editorial-text/70'">
                  Object_ID / Username
                </label>
                <input id="username" type="text" formControlName="username"
                  class="w-full px-0 py-4 bg-transparent border-b border-editorial-text/20 focus:border-editorial-text outline-none transition-all font-mono text-[11px] uppercase tracking-widest text-editorial-text placeholder:text-editorial-text/50"
                  [class.border-rose-500]="profileForm.get('username')?.invalid && profileForm.get('username')?.touched">
                @if (profileForm.get('username')?.invalid && profileForm.get('username')?.touched) {
                  <p class="text-[8px] font-mono uppercase tracking-widest text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                    ERR: Field_Required
                  </p>
                }
              </div>
              <div class="space-y-3">
                <label for="email" class="text-[9px] font-mono font-bold uppercase tracking-[0.2em] transition-colors"
                  [class]="profileForm.get('email')?.invalid && profileForm.get('email')?.touched ? 'text-rose-500' : 'text-editorial-text/70'">
                  Access_Key / Email Address
                </label>
                <input id="email" type="email" formControlName="email"
                  class="w-full px-0 py-4 bg-transparent border-b border-editorial-text/20 focus:border-editorial-text outline-none transition-all font-mono text-[11px] uppercase tracking-widest text-editorial-text placeholder:text-editorial-text/50"
                  [class.border-rose-500]="profileForm.get('email')?.invalid && profileForm.get('email')?.touched">
                @if (profileForm.get('email')?.invalid && profileForm.get('email')?.touched) {
                  <p class="text-[8px] font-mono uppercase tracking-widest text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                    @if (profileForm.get('email')?.errors?.['required']) { ERR: Field_Required }
                    @else if (profileForm.get('email')?.errors?.['email']) { ERR: Protocol_Invalid (Bad Email format) }
                  </p>
                }
              </div>
            </div>
            
            <div class="pt-6">
              <button type="submit" [disabled]="profileForm.pristine || profileForm.invalid || isBusy()"
                class="px-12 py-4 bg-editorial-text text-editorial-bg text-[10px] font-mono font-bold uppercase tracking-[0.3em] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-10 grayscale">
                @if (isBusy()) { [ COMMIT_ACTIVE ] } @else if (profileForm.invalid && profileForm.touched) { [ COMMIT_BLOCKED ] } @else { Commit_Changes }
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `
})
export class ProfileSettingsComponent extends BaseComponent implements OnInit {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  profileForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({ 
        username: user.username, 
        email: user.email 
      });
    }
  }

  onUpdateProfile() {
    if (this.profileForm.valid) {
      this.isBusy.set(true);
      // Faked API call for profile update
      setTimeout(() => { 
        this.isBusy.set(false); 
        this.profileForm.markAsPristine(); 
        this.notificationService.success('IDENTITY_UPDATE: Profile changes committed to distributed ledger.');
      }, 1000);
    } else {
      this.notificationService.error('ERR_VALIDATION: Input parameters invalid.');
    }
  }
}
