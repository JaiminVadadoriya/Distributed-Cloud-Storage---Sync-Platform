import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { FileService } from '../../core/file.service';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-3xl font-extrabold mb-8 bg-gradient-to-r from-primary to-primary-focus bg-clip-text text-transparent">Settings</h1>

      <!-- Profile Section -->
      <div class="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-8 mb-8 shadow-sm transition-all hover:shadow-md">
         <div class="flex items-center gap-3 mb-6">
            <div class="p-2.5 rounded-2xl bg-primary/10 text-primary">
               <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h2 class="text-xl font-bold">Profile Information</h2>
         </div>
         
         <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()" class="space-y-6">
            <div class="grid grid-cols-1 gap-6">
               <div class="space-y-2">
                  <label for="username" class="text-sm font-semibold text-text-muted ml-1">Username</label>
                  <input id="username" type="text" formControlName="username" 
                    class="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400">
               </div>
               
               <div class="space-y-2">
                  <label for="email" class="text-sm font-semibold text-text-muted ml-1">Email Address</label>
                  <input id="email" type="email" formControlName="email" 
                    class="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400">
               </div>
            </div>

            <div class="pt-2">
               <button type="submit" [disabled]="profileForm.pristine || isLoading" 
                 class="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-primary text-primary-content font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  Save Changes
               </button>
            </div>
         </form>
      </div>

      <!-- Danger Zone Section -->
      <div class="bg-red-50/50 dark:bg-red-500/5 rounded-3xl border border-red-100 dark:border-red-500/10 p-8 shadow-sm transition-all hover:shadow-md">
         <div class="flex items-center gap-3 mb-6">
            <div class="p-2.5 rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/20">
               <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 class="text-xl font-bold text-red-600">Danger Zone</h2>
         </div>

         <div class="space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-black/20 border border-red-50 dark:border-red-500/5">
                <div>
                    <h3 class="font-bold text-gray-900 dark:text-white">Clean Whole Drive</h3>
                    <p class="text-gray-500 text-sm mt-1">Permanently remove all your files from storage. This cannot be undone.</p>
                </div>
                <button 
                  (click)="showCleanModal.set(true)"
                  class="px-6 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 active:scale-[0.98] transition-all shadow-lg shadow-red-600/20">
                    Clean Drive
                </button>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl translate-y-0 hover:translate-y-[-2px] transition-transform">
                <div>
                    <h3 class="font-bold text-gray-500">Delete Account</h3>
                    <p class="text-gray-400 text-sm mt-1">Once you delete your account, there is no going back. Please be certain.</p>
                </div>
                <button class="px-6 py-3 rounded-2xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed opacity-50">
                    Delete
                </button>
            </div>
         </div>
      </div>
    </div>

    <!-- Clean Drive Confirmation Modal -->
    @if (showCleanModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
             (click)="showCleanModal.set(false)" 
             (keydown.escape)="showCleanModal.set(false)"
             role="button"
             tabindex="-1"
             aria-label="Close modal"></div>
        
        <!-- Modal Content -->
        <div class="relative w-full max-w-md bg-white dark:bg-[#1a1c1e] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in duration-300">
            <div class="p-8">
                <div class="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-2xl flex items-center justify-center text-red-600 mb-6 mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
                
                <h3 class="text-2xl font-black text-center mb-2">Are you sure?</h3>
                <p class="text-gray-500 dark:text-gray-400 text-center mb-8 px-4 text-balance">
                    This will permanently delete all your files. Please type <span class="font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-lg">clean</span> to confirm this action.
                </p>
                
                <input 
                    type="text" 
                    [(ngModel)]="cleanConfirmText"
                    placeholder="Enter 'clean' here"
                    class="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all placeholder:text-gray-400 text-center font-medium text-lg mb-6"
                >
                
                <div class="flex flex-col gap-3">
                    <button 
                        [disabled]="cleanConfirmText !== 'clean' || isCleaningDrive"
                        (click)="onConfirmCleanDrive()"
                        class="w-full py-4 rounded-2xl bg-red-600 text-white font-black text-lg shadow-xl shadow-red-600/20 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale">
                        {{ isCleaningDrive ? 'Cleaning Drive...' : 'Yes, Delete Everything' }}
                    </button>
                    <button 
                        (click)="showCleanModal.set(false)"
                        class="w-full py-4 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
            
            <!-- Progress bar if needed -->
            @if (isCleaningDrive) {
                <div class="h-1.5 w-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                    <div class="h-full bg-red-600 animate-progress"></div>
                </div>
            }
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes progress {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }
    .animate-progress {
        animation: progress 1.5s infinite linear;
        width: 100%;
    }
  `]
})
export class SettingsComponent {
  authService = inject(AuthService);
  fileService = inject(FileService);
  fb = inject(FormBuilder);
  
  profileForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = false;
  showCleanModal = signal(false);
  cleanConfirmText = '';
  isCleaningDrive = false;

  constructor() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm.patchValue({
          username: user.username,
          email: user.email
        });
      }
    });
  }

  onUpdateProfile() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      // Mock API call
      setTimeout(() => {
        this.isLoading = false;
        this.profileForm.markAsPristine();
      }, 1000);
    }
  }

  onConfirmCleanDrive() {
    if (this.cleanConfirmText === 'clean') {
      this.isCleaningDrive = true;
      this.fileService.deleteAllFiles().subscribe({
        next: () => {
          this.isCleaningDrive = false;
          this.showCleanModal.set(false);
          this.cleanConfirmText = '';
          // Show success message or redirect if needed
        },
        error: (err) => {
          this.isCleaningDrive = false;
          console.error('Failed to clean drive:', err);
          // Show error message
        }
      });
    }
  }
}
