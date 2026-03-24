import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';

@Component({
  selector: 'app-encryption-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-12">
      <div class="pb-8 border-b border-editorial-text/20">
        <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">Encryption</h1>
        <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60 mt-2">Client-side encryption and key management</p>
      </div>

      <div class="border border-editorial-text/10 bg-editorial-text/[0.01] p-10 space-y-8">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <h3 class="text-sm font-mono font-bold uppercase tracking-[0.3em] text-editorial-text">End-to-End_Encryption</h3>
            <p class="text-[9px] font-mono text-editorial-text/50 uppercase tracking-widest">Encrypt files before upload</p>
          </div>
          <div class="w-12 h-6 rounded-none border border-editorial-text/20 bg-editorial-text/5 flex items-center px-1 cursor-not-allowed opacity-50"
            [class.bg-editorial-text]="encryptionEnabled()" [class.justify-end]="encryptionEnabled()">
            <div class="w-4 h-4 rounded-none bg-editorial-text/30" [class.bg-editorial-bg]="encryptionEnabled()"></div>
          </div>
        </div>

        <div class="border-t border-editorial-text/10 pt-8 space-y-4">
          <h4 class="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-editorial-text/70">Key_Management</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-6 border border-editorial-text/5 space-y-2 opacity-50">
              <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Primary_Key</div>
              <div class="text-[10px] font-mono text-editorial-text/30">••••••••-••••-••••</div>
            </div>
            <div class="p-6 border border-editorial-text/5 space-y-2 opacity-50">
              <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Recovery_Key</div>
              <div class="text-[10px] font-mono text-editorial-text/30">Not_Generated</div>
            </div>
          </div>
        </div>

        <div class="p-4 border border-amber-500/20 bg-amber-500/5">
          <p class="text-[9px] font-mono uppercase tracking-widest text-amber-600">
            &#9888; Encryption features are currently in development. This interface is read-only.
          </p>
        </div>
      </div>
    </div>
  `
})
export class EncryptionSettingsComponent extends BaseComponent {
  encryptionEnabled = signal(false);
}
