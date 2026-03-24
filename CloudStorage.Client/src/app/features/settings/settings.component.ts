import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { FileService } from '../../core/services/file.service';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { BaseComponent } from '../../core/models/base-component';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="max-w-4xl px-8 py-16 selection:bg-editorial-text selection:text-editorial-bg">
      <div class="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-editorial-text/20 pb-12">
        <div class="space-y-4">
          <h1 class="text-6xl font-sans font-bold tracking-tighter text-editorial-text uppercase">Identity_Prefs</h1>
          <p class="text-[10px] font-mono uppercase tracking-[0.4em] text-editorial-text/70">SYSTEM_CONFIGURATION: NODE_001</p>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="flex gap-0 border-b border-editorial-text/20 mb-16">
        @for (tab of tabs; track tab.id) {
          <button (click)="activeTab.set(tab.id)"
            class="px-6 py-3 text-[9px] font-mono uppercase tracking-[0.3em] transition-none border-b-2 -mb-px"
            [class]="activeTab() === tab.id ? 'border-editorial-text text-editorial-text font-bold' : 'border-transparent text-editorial-text/40 hover:text-editorial-text/70'">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Profile Section -->
      @if (activeTab() === 'profile') {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div class="lg:col-span-4 space-y-12">
            <div class="space-y-4">
              <div class="text-[9px] font-mono font-bold text-editorial-text/70 uppercase tracking-[0.3em] mb-4">Core_Account</div>
              <div class="p-8 border border-editorial-text/20 bg-editorial-text/[0.01] space-y-6 group">
                <div class="w-12 h-12 border border-editorial-text/20 flex items-center justify-center text-editorial-text/70 group-hover:border-editorial-text transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div class="space-y-1" *ngIf="authService.currentUser() as user">
                  <div class="text-[10px] font-mono font-bold uppercase tracking-widest">{{ user.username }}</div>
                  <div class="text-[9px] font-mono uppercase tracking-tighter text-editorial-text/70">{{ user.email }}</div>
                </div>
              </div>
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
                    <label for="username" class="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-editorial-text/70">Object_ID / Username</label>
                    <input id="username" type="text" formControlName="username"
                      class="w-full px-0 py-4 bg-transparent border-b border-editorial-text/20 focus:border-editorial-text outline-none transition-all font-mono text-[11px] uppercase tracking-widest text-editorial-text placeholder:text-editorial-text/50">
                  </div>
                  <div class="space-y-3">
                    <label for="email" class="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-editorial-text/70">Access_Key / Email Address</label>
                    <input id="email" type="email" formControlName="email"
                      class="w-full px-0 py-4 bg-transparent border-b border-editorial-text/20 focus:border-editorial-text outline-none transition-all font-mono text-[11px] uppercase tracking-widest text-editorial-text placeholder:text-editorial-text/50">
                  </div>
                </div>
                <div class="pt-6">
                  <button type="submit" [disabled]="profileForm.pristine || isLoading"
                    class="px-12 py-4 bg-editorial-text text-editorial-bg text-[10px] font-mono font-bold uppercase tracking-[0.3em] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-10 grayscale">
                    Commit_Changes
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      }

      <!-- Security Section -->
      @if (activeTab() === 'security') {
        <div class="space-y-16">
          <section class="space-y-10">
            <div class="pb-4 border-b border-editorial-text/20">
              <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">Active_Sessions</h2>
            </div>
            <div class="border border-editorial-text/20 divide-y divide-editorial-text/10">
              <div class="flex items-center justify-between p-6 bg-editorial-text/[0.02]">
                <div class="space-y-1">
                  <div class="text-[10px] font-mono font-bold uppercase tracking-widest text-editorial-text">Current_Browser</div>
                  <div class="text-[9px] font-mono text-editorial-text/50">Windows · Chrome · Active now</div>
                </div>
                <span class="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[8px] font-mono uppercase tracking-widest border border-emerald-500/20">Active</span>
              </div>
              <div class="flex items-center justify-between p-6">
                <div class="space-y-1">
                  <div class="text-[10px] font-mono font-bold uppercase tracking-widest text-editorial-text/70">Mobile_App</div>
                  <div class="text-[9px] font-mono text-editorial-text/40">iOS · Last seen 2h ago</div>
                </div>
                <button class="px-4 py-1.5 border border-editorial-text/20 text-[8px] font-mono uppercase tracking-widest hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-none">
                  Revoke
                </button>
              </div>
            </div>
          </section>

          <section class="space-y-10">
            <div class="pb-4 border-b border-editorial-text/20">
              <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">Security_Actions</h2>
            </div>
            <div class="space-y-4">
              <button class="w-full flex items-center justify-between p-6 border border-editorial-text/20 hover:bg-editorial-text/[0.02] transition-none group">
                <div class="space-y-1 text-left">
                  <div class="text-[10px] font-mono font-bold uppercase tracking-widest text-editorial-text">Logout_All_Devices</div>
                  <div class="text-[9px] font-mono text-editorial-text/50">Terminate all active sessions except this one</div>
                </div>
                <span class="text-[9px] font-mono uppercase tracking-widest text-editorial-text/30 group-hover:text-editorial-text">Execute &rarr;</span>
              </button>
              <div class="flex items-center justify-between p-6 border border-editorial-text/10 opacity-60">
                <div class="space-y-1">
                  <div class="text-[10px] font-mono font-bold uppercase tracking-widest text-editorial-text">Two-Factor_Auth</div>
                  <div class="text-[9px] font-mono text-editorial-text/50">Hardware key or TOTP authentication (Coming Soon)</div>
                </div>
                <span class="px-3 py-1 border border-editorial-text/10 text-[8px] font-mono uppercase tracking-widest text-editorial-text/30">Planned</span>
              </div>
            </div>
          </section>
        </div>
      }

      <!-- Storage Section -->
      @if (activeTab() === 'storage') {
        <div class="space-y-16">
          <section class="space-y-10">
            <div class="pb-4 border-b border-editorial-text/20">
              <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">Storage_Breakdown</h2>
            </div>
            <div class="space-y-4">
              @for (item of storageItems; track item.label) {
                <div class="flex items-center gap-6 py-3">
                  <div class="w-3 h-3 rounded-none" [style.background]="item.color"></div>
                  <div class="flex-1">
                    <div class="flex justify-between mb-1">
                      <span class="text-[9px] font-mono uppercase tracking-widest text-editorial-text/70">{{ item.label }}</span>
                      <span class="text-[9px] font-mono text-editorial-text/50">{{ item.size }}</span>
                    </div>
                    <div class="h-1 w-full bg-editorial-text/5 overflow-hidden">
                      <div class="h-full" [style.width.%]="item.percent" [style.background]="item.color"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="space-y-10">
            <div class="pb-4 border-b border-editorial-text/20">
              <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">Cleanup_Tools</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button class="p-6 border border-editorial-text/20 text-left hover:bg-editorial-text/[0.02] transition-none space-y-2 group">
                <div class="text-[10px] font-mono font-bold uppercase tracking-widest text-editorial-text">Empty_Trash</div>
                <div class="text-[9px] font-mono text-editorial-text/50">Permanently remove all items in recycle bin</div>
              </button>
              <button class="p-6 border border-editorial-text/20 text-left hover:bg-editorial-text/[0.02] transition-none space-y-2 group">
                <div class="text-[10px] font-mono font-bold uppercase tracking-widest text-editorial-text">Clear_Duplicates</div>
                <div class="text-[9px] font-mono text-editorial-text/50">Scan and remove duplicate file entries</div>
              </button>
            </div>
          </section>
        </div>
      }

      <!-- Notifications Section -->
      @if (activeTab() === 'notifications') {
        <div class="space-y-16">
          <section class="space-y-10">
            <div class="pb-4 border-b border-editorial-text/20">
              <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">Notification_Preferences</h2>
            </div>
            <div class="space-y-0 divide-y divide-editorial-text/10 border-y border-editorial-text/10">
              @for (pref of notificationPrefs; track pref.label) {
                <div class="flex items-center justify-between py-6 px-2">
                  <div class="space-y-1">
                    <div class="text-[10px] font-mono font-bold uppercase tracking-widest text-editorial-text">{{ pref.label }}</div>
                    <div class="text-[9px] font-mono text-editorial-text/50">{{ pref.description }}</div>
                  </div>
                  <button (click)="pref.enabled = !pref.enabled"
                    class="w-10 h-5 rounded-none border border-editorial-text/20 flex items-center px-0.5 transition-colors"
                    [class.bg-editorial-text]="pref.enabled" [class.justify-end]="pref.enabled">
                    <div class="w-3.5 h-3.5 rounded-none transition-all"
                      [class]="pref.enabled ? 'bg-editorial-bg' : 'bg-editorial-text/30'"></div>
                  </button>
                </div>
              }
            </div>
          </section>
        </div>
      }

      <!-- Danger Zone -->
      @if (activeTab() === 'danger') {
        <div class="space-y-10">
          <div class="pb-4 border-b border-rose-500/10">
            <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-rose-500">Critical_Actions</h2>
          </div>

          <div class="space-y-1 divide-y divide-editorial-text/20 border-y border-editorial-text/20">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 py-10 group">
              <div class="space-y-2 max-w-lg">
                <h3 class="text-xs font-mono font-bold uppercase tracking-widest text-editorial-text">Purge_Drive_Volume</h3>
                <p class="text-[10px] font-mono uppercase tracking-tighter text-editorial-text/70 leading-relaxed">Permanently disconnect and delete all data objects from the storage array. This action is irreversible.</p>
              </div>
              <button (click)="showCleanModal.set(true)"
                class="px-8 py-3 bg-rose-600 text-white text-[9px] font-mono font-bold uppercase tracking-[0.2em] hover:bg-rose-700 transition-all">
                Exec_Purge
              </button>
            </div>

            <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 py-10 opacity-60">
              <div class="space-y-2 max-w-lg">
                <h3 class="text-xs font-mono font-bold uppercase tracking-widest text-editorial-text">Terminate_Identity</h3>
                <p class="text-[10px] font-mono uppercase tracking-tighter text-editorial-text/70 leading-relaxed">Finalize global account termination. System logic restricted for current session.</p>
              </div>
              <button class="px-8 py-3 border border-editorial-text text-editorial-text text-[9px] font-mono font-bold uppercase tracking-[0.2em] cursor-not-allowed">
                Restricted
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Clean Drive Confirmation Modal -->
    @if (showCleanModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-8 bg-editorial-text/10"
           (click)="showCleanModal.set(false)" (keydown.escape)="showCleanModal.set(false)" tabindex="0">
        <div class="relative w-full max-w-xl bg-editorial-bg border-2 border-editorial-text p-12 rounded-none relative overflow-hidden"
             (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()" tabindex="0">
            <div class="grain-overlay pointer-events-none opacity-[0.03]"></div>
            <div class="relative z-10 space-y-12">
                <div class="flex items-center gap-8 border-b border-editorial-text/20 pb-8">
                  <div class="w-16 h-16 border border-rose-500/30 flex items-center justify-center text-rose-500 rounded-none text-3xl font-bold font-mono">!</div>
                  <div class="space-y-2">
                    <h3 class="text-2xl font-mono font-bold uppercase tracking-[0.4em] text-rose-500">AUTH_REQUIRED</h3>
                    <p class="text-[10px] font-mono uppercase tracking-[0.2em] text-editorial-text/70">CONFIRM VOLUME DESTRUCTION PROTOCOL</p>
                  </div>
                </div>
                <p class="text-[11px] font-mono uppercase tracking-widest text-editorial-text leading-loose">
                    This action will permanently purge all linked data segments. To proceed with the destruction, input the confirmation string <span class="text-rose-600 font-bold bg-rose-500/5 px-2 py-1 border border-rose-500/10 ml-2">clean</span>.
                </p>
                <div class="space-y-8">
                  <input type="text" [(ngModel)]="cleanConfirmText" placeholder="Input_String..."
                      class="w-full px-0 py-6 bg-transparent border-b-2 border-editorial-text focus:border-rose-500 outline-none transition-none text-center font-mono font-bold text-xl uppercase tracking-[0.5em] text-editorial-text placeholder:text-editorial-text/50">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-editorial-text/10 border border-editorial-text/10">
                      <button [disabled]="cleanConfirmText !== 'clean' || isCleaningDrive" (click)="onConfirmCleanDrive()"
                          class="px-8 py-5 bg-rose-600 text-white text-[11px] font-mono font-bold uppercase tracking-[0.3em] transition-none disabled:opacity-10 grayscale rounded-none">
                          {{ isCleaningDrive ? 'PURGE_ACTIVE...' : 'YES_INITIATE_PURGE' }}
                      </button>
                      <button (click)="showCleanModal.set(false)"
                          class="px-8 py-5 bg-editorial-bg text-editorial-text text-[11px] font-mono font-bold uppercase tracking-[0.3em] hover:bg-editorial-text hover:text-editorial-bg transition-none rounded-none">
                          ABORT_SEQ
                      </button>
                  </div>
                </div>
            </div>
            @if (isCleaningDrive) {
                <div class="absolute bottom-0 left-0 h-1 w-full bg-editorial-text/5 overflow-hidden">
                    <div class="h-full bg-rose-600 animate-[shimmer_1.5s_infinite]"></div>
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
export class SettingsComponent extends BaseComponent {
  authService = inject(AuthService);
  fileService = inject(FileService);
  fb = inject(FormBuilder);

  activeTab = signal<string>('profile');

  tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'storage', label: 'Storage' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'danger', label: 'Danger_Zone' },
  ];

  profileForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = false;
  showCleanModal = signal(false);
  cleanConfirmText = '';
  isCleaningDrive = false;

  storageItems = [
    { label: 'Documents', size: '2.4 GB', percent: 45, color: '#1A1A1A' },
    { label: 'Images', size: '1.8 GB', percent: 34, color: '#4A4A4A' },
    { label: 'Videos', size: '800 MB', percent: 15, color: '#7A7A7A' },
    { label: 'Archives', size: '200 MB', percent: 4, color: '#AAAAAA' },
    { label: 'Other', size: '120 MB', percent: 2, color: '#CCCCCC' },
  ];

  notificationPrefs = [
    { label: 'Upload_Complete', description: 'Notify when file uploads finish', enabled: true },
    { label: 'Share_Received', description: 'Alert when files are shared with you', enabled: true },
    { label: 'Sync_Errors', description: 'Critical sync failure notifications', enabled: true },
    { label: 'Storage_Warnings', description: 'Approaching storage limit alerts', enabled: true },
    { label: 'Email_Digest', description: 'Weekly activity summary via email', enabled: false },
  ];

  constructor() {
    super();
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({ username: user.username, email: user.email });
    }
  }

  onUpdateProfile() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      setTimeout(() => { this.isLoading = false; this.profileForm.markAsPristine(); }, 1000);
    }
  }

  onConfirmCleanDrive() {
    if (this.cleanConfirmText === 'clean') {
      this.isCleaningDrive = true;
      this.fileService.deleteAllFiles().subscribe({
        next: () => { this.isCleaningDrive = false; this.showCleanModal.set(false); this.cleanConfirmText = ''; },
        error: (err) => { this.isCleaningDrive = false; console.error('Failed to clean drive:', err); }
      });
    }
  }
}
