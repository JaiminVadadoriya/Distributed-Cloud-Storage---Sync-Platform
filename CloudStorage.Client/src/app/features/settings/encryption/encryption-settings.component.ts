import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-encryption-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 selection:bg-editorial-text selection:text-editorial-bg">
      <header class="pb-12 border-b-2 border-editorial-text space-y-4">
        <h3 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 italic">Kernel_Security</h3>
        <h1 class="text-6xl font-sans font-bold tracking-tighter text-editorial-text uppercase italic leading-none">Cryption_Vault</h1>
        <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/60">Manage hardware-accelerated segment encryption keys</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div class="p-10 border border-editorial-text/10 bg-editorial-text/[0.01] space-y-8 relative group overflow-hidden">
          <div class="grain-wrapper">
            <div class="absolute inset-0 opacity-[0.02] grain-overlay select-none"></div>
          </div>
          <div class="relative z-10 space-y-6">
            <h4 class="text-sm font-mono font-bold uppercase tracking-[0.3em] text-editorial-text pb-4 border-b border-editorial-text/10">Active_Protocol</h4>
            <div class="space-y-2">
              <div class="text-3xl font-sans font-bold uppercase tracking-tight text-editorial-text">AES_256_GCM</div>
              <p class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 leading-relaxed italic">Hardware-bound sequence initialized. Identity segment binding confirmed.</p>
            </div>
            <div class="flex items-center gap-4 py-4 px-6 border border-emerald-500/10 bg-emerald-500/5">
               <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               <span class="font-mono text-[8px] uppercase tracking-widest text-emerald-600 font-bold">Encrypted_IO: Passive_Active</span>
            </div>
          </div>
        </div>

        <div class="p-10 border border-editorial-text/10 space-y-10 group opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          <h4 class="text-sm font-mono font-bold uppercase tracking-[0.3em] text-editorial-text pb-4 border-b border-editorial-text/10">Personal_Identity_Seal</h4>
          <p class="font-mono text-[10px] uppercase tracking-widest text-editorial-text/40 leading-relaxed">
            Initialize an isolated identity seal using a local hardware security module (HSM). Metadata remains encrypted beyond system admin access.
          </p>
          <div class="pt-8 flex justify-between items-center">
             <span class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/30">LOCKED_TIER</span>
             <button disabled class="px-8 py-3 border border-editorial-text/20 text-editorial-text/20 font-mono text-[9px] uppercase tracking-widest cursor-not-allowed">
               RESTRICED
             </button>
          </div>
        </div>
      </div>

      <section class="space-y-10 pb-20">
         <div class="pb-4 border-b border-editorial-text/20">
            <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text italic">02. Recovery_Key_Backup</h2>
         </div>
         <div class="p-12 border-2 border-editorial-text border-dashed text-center space-y-10">
            <div class="w-16 h-16 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-3xl font-mono select-none">&#128273;</div>
            <div class="space-y-4 max-w-lg mx-auto">
               <p class="font-mono text-xs uppercase tracking-widest text-editorial-text/60 leading-loose">
                 Your unique master recovery sequence has not been exported. Failure to preserve this sequence will result in total data loss upon node desynchronization.
               </p>
               <button (click)="downloadRecoveryKey()" class="px-12 py-5 bg-editorial-text text-editorial-bg font-mono text-[10px] font-bold uppercase tracking-[0.3em] hover:opacity-90 transition-all">
                 Download_Identity_Segment
               </button>
            </div>
         </div>
      </section>

      <footer class="opacity-20 flex justify-between items-center text-[8px] font-mono uppercase tracking-[0.5em] pb-10">
         <span>Sync_Hash: B9-7F-D4</span>
         <div class="h-[1px] flex-1 bg-editorial-text/10 mx-12"></div>
         <span>Kernel_Access: Root_Limited</span>
      </footer>
    </div>
  `
})
export class EncryptionSettingsComponent {
  downloadRecoveryKey() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const hexKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    const uuid = crypto.randomUUID ? crypto.randomUUID() : 'N/A';
    
    const fileContent = `==================================================
CLOUDSTORAGE IDENTITY RECOVERY SEGMENT KEY
==================================================
Key ID: ${uuid}
Export Date: ${new Date().toISOString()}
Protocol: AES-256-GCM

RECOVERY KEY HASH:
${hexKey.match(/.{1,4}/g)?.join('-') || hexKey}

IMPORTANT: Store this key in a secure physical location.
Do not share this key. It is required to restore access 
to your identity segment.
==================================================`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cloudstorage_recovery_key_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
