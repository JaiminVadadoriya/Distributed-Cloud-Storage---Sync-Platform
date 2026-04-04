import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../core/models/base-component';
import { ProfileSettingsComponent } from './profile/profile-settings.component';
import { AppearanceSettingsComponent } from './appearance/appearance-settings.component';
import { SecuritySettingsComponent } from './security/security-settings.component';
import { AuditLogComponent } from '../activity/audit-log/audit-log.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ProfileSettingsComponent,
    AppearanceSettingsComponent,
    SecuritySettingsComponent,
    AuditLogComponent
  ],
  template: `
    <div class="max-w-6xl px-12 py-24 selection:bg-editorial-text selection:text-editorial-bg animate-in fade-in duration-700">
      <header class="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-editorial-text/20 pb-16">
        <div class="space-y-4">
          <h3 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 italic">System_Configuration</h3>
          <h1 class="text-7xl font-sans font-bold tracking-tighter text-editorial-text uppercase italic leading-none">Identity_Prefs</h1>
          <div class="flex items-center gap-6 mt-6">
             <span class="w-16 h-[1px] bg-editorial-text"></span>
             <p class="text-[10px] font-mono uppercase tracking-[0.4em] text-editorial-text/70">NODE_SESSION: ACTIVE_SECURE</p>
          </div>
        </div>
      </header>

      <!-- Tab Navigation (Technical Breadcrumb Style) -->
      <nav class="flex flex-wrap gap-x-12 gap-y-6 mb-24 border-b border-editorial-text/10 pb-4">
        @for (tab of tabs; track tab.id) {
          <button (click)="activeTab.set(tab.id)"
            class="group flex items-baseline gap-3 text-[10px] font-mono uppercase tracking-[0.3em] transition-all relative py-2"
            [class]="activeTab() === tab.id ? 'text-editorial-text font-bold opacity-100' : 'text-editorial-text/30 hover:text-editorial-text opacity-60 hover:opacity-100'">
            <span class="text-[8px] opacity-40 group-hover:opacity-100 transition-opacity">0{{ $index + 1 }}</span>
            {{ tab.label }}
            @if (activeTab() === tab.id) {
               <div class="absolute bottom-0 left-0 w-full h-[2px] bg-editorial-text animate-in slide-in-from-left duration-300"></div>
            }
          </button>
        }
      </nav>

      <!-- Content Area -->
      <main class="min-h-[50vh]">
        @switch (activeTab()) {
          @case ('profile') { <app-profile-settings></app-profile-settings> }
          @case ('appearance') { <app-appearance-settings></app-appearance-settings> }
          @case ('security') { <app-security-settings></app-security-settings> }
          @case ('audit') { <app-audit-log></app-audit-log> }
        }
      </main>

      <footer class="mt-48 pt-12 border-t border-editorial-text/10 flex justify-between items-center text-[9px] font-mono uppercase tracking-[0.5em] opacity-20 hover:opacity-100 transition-opacity duration-1000">
         <span>Hardware_Key: DETECTED_SECURE_ENCLAVE</span>
         <div class="flex gap-12">
            <span>Kernel_Version: 21.0.40</span>
            <span>Cluster: EMEA-VOID-3</span>
         </div>
      </footer>
    </div>
  `
})
export class SettingsComponent extends BaseComponent {
  activeTab = signal<string>('profile');

  tabs = [
    { id: 'profile', label: 'Identity' },
    { id: 'appearance', label: 'Atmosphere' },
    { id: 'security', label: 'Protocols' },
    { id: 'audit', label: 'Archive' },
  ];
}
