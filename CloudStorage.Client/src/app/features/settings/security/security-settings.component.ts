import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <!-- Active Sessions -->
      <section class="space-y-12">
        <header class="pb-4 border-b border-editorial-text/20">
          <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">01. Node_Authentication</h2>
        </header>

        <div class="border border-editorial-text/10 bg-editorial-text/[0.01] divide-y divide-editorial-text/5">
          @for (session of sessions(); track session.id) {
            <div class="flex items-center justify-between p-8 group hover:bg-editorial-text/[0.02] transition-colors relative">
              <div class="flex items-center gap-6">
                <div class="w-10 h-10 border border-editorial-text/10 flex items-center justify-center text-editorial-text/30 group-hover:border-editorial-text/60 transition-colors">
                  @if (session.deviceType === 'desktop') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  }
                </div>
                <div class="space-y-1">
                  <div class="flex items-center gap-3">
                    <h4 class="font-sans text-sm font-bold uppercase tracking-tight text-editorial-text">{{ session.name }}</h4>
                    @if (session.isCurrent) {
                      <span class="px-2 py-0.5 border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 font-mono text-[8px] uppercase tracking-widest font-bold italic animate-pulse">Identity_Master</span>
                    }
                  </div>
                  <p class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/40">IP: {{ session.ip }} | Last_Seen: {{ session.lastSeen }}</p>
                </div>
              </div>

              @if (!session.isCurrent) {
                <button (click)="revokeSession(session.id)" 
                        class="px-6 py-2 border border-editorial-text/20 font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all">
                  Revoke_Key
                </button>
              }
              
              <div class="absolute bottom-0 right-0 h-[1px] w-0 group-hover:w-20 bg-editorial-text/20 transition-all duration-500"></div>
            </div>
          }
        </div>
      </section>

      <!-- Advanced Security Control -->
      <section class="space-y-12">
        <header class="pb-4 border-b border-editorial-text/20">
          <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">02. Protocol_Hardening</h2>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="p-8 border border-editorial-text/10 space-y-6 group hover:border-editorial-text/40 transition-all">
             <div class="w-10 h-10 border border-editorial-text/10 flex items-center justify-center text-editorial-text/40">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
             </div>
             <div class="space-y-4">
               <h4 class="font-sans text-md font-bold uppercase tracking-tight text-editorial-text">Encryption_Sublayer</h4>
               <p class="font-mono text-[10px] uppercase tracking-widest text-editorial-text/40 leading-relaxed">
                 AES-256-GCM Hardware keys are initialized during boot sequence. Current state: COMPLIANT
               </p>
               <button class="px-6 py-2 border border-editorial-text/20 font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 cursor-not-allowed">
                 Re-Key Sublayer
               </button>
             </div>
          </div>

          <div class="p-8 border border-editorial-text/10 space-y-6 group hover:border-editorial-text/40 transition-all">
             <div class="w-10 h-10 border border-editorial-text/10 flex items-center justify-center text-editorial-text/40">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
             </div>
             <div class="space-y-4">
               <h4 class="font-sans text-md font-bold uppercase tracking-tight text-editorial-text">Auth_Factors_2FA</h4>
               <p class="font-mono text-[10px] uppercase tracking-widest text-editorial-text/40 leading-relaxed">
                 Enforce secondary proof of identity (FIDO2 or TOTP) for node access. Status: DISABLED
               </p>
               <button class="px-6 py-2 border border-editorial-text text-editorial-text font-mono text-[9px] uppercase tracking-widest hover:bg-editorial-text hover:text-editorial-bg transition-all">
                 Configure
               </button>
             </div>
          </div>
        </div>
      </section>

      <!-- Cleanup Area -->
      <section class="space-y-12">
        <header class="pb-4 border-b border-editorial-text/20">
          <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text italic">03. Emergency_Protocols</h2>
        </header>
        
        <div class="p-10 border-2 border-editorial-text bg-editorial-text text-editorial-bg space-y-8 relative overflow-hidden group">
           <div class="absolute inset-0 opacity-10 grain-overlay"></div>
           <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-12">
              <div class="space-y-2 max-w-lg">
                <h3 class="text-2xl font-sans font-bold uppercase tracking-tighter italic">Terminate_Identity</h3>
                <p class="font-mono text-[10px] uppercase tracking-widest text-editorial-bg/60 leading-relaxed">
                  Permanently purge the core identity node and all associated storage sectors. Irreversible destruction protocol.
                </p>
              </div>
              <button class="px-10 py-6 bg-rose-600 text-white font-mono text-xs font-bold uppercase tracking-[0.3em] hover:bg-rose-700 transition-all grayscale hover:grayscale-0">
                Finalize Terminate
              </button>
           </div>
        </div>
      </section>
    </div>
  `
})
export class SecuritySettingsComponent extends BaseComponent {
  private notify = inject(NotificationService);

  sessions = signal([
    { id: '1', name: 'Workstation_01 (This Device)', deviceType: 'desktop', ip: '192.168.1.45', lastSeen: 'Active_Now', isCurrent: true },
    { id: '2', name: 'Identity_Mobile_iOS', deviceType: 'mobile', ip: '172.20.10.1', lastSeen: '02_HRS_AGO', isCurrent: false },
    { id: '3', name: 'Remote_Node_Linux', deviceType: 'desktop', ip: '10.0.8.22', lastSeen: '24_HRS_AGO', isCurrent: false },
  ]);

  revokeSession(id: string) {
    this.sessions.set(this.sessions().filter(s => s.id !== id));
    this.notify.success('PROTOCOLS_REVOKED: Key segment terminated');
  }
}
