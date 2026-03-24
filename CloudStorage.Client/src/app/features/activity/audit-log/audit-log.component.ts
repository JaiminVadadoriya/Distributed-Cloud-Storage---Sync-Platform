import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { AuditEntry } from '../../../core/models/file.model';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-12">
      <div class="pb-8 border-b border-editorial-text/20">
        <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">Audit_Log</h1>
        <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60 mt-2">Security events and access records</p>
      </div>

      <div class="border border-editorial-text/10 bg-editorial-text/[0.01] p-10 text-center space-y-6">
        <div class="w-16 h-16 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-3xl font-mono">&#128274;</div>
        <div class="space-y-2">
          <h3 class="text-sm font-mono font-bold uppercase tracking-[0.3em] text-editorial-text/60">Enterprise_Feature</h3>
          <p class="text-[10px] font-mono uppercase tracking-widest text-editorial-text/40">
            Detailed audit logging is available on Enterprise plan.
          </p>
          <p class="text-[9px] font-mono text-editorial-text/30 mt-4">
            Track file access, permission changes, and security events.
          </p>
        </div>
      </div>

      <!-- Preview Table -->
      <div class="opacity-50 pointer-events-none">
        <div class="border border-editorial-text/10 divide-y divide-editorial-text/5">
          <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-editorial-text/[0.02]">
            <div class="col-span-3 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/30">Action</div>
            <div class="col-span-3 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/30">Target</div>
            <div class="col-span-2 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/30">User</div>
            <div class="col-span-2 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/30">IP</div>
            <div class="col-span-2 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/30">Time</div>
          </div>
          @for (i of [1,2,3,4,5]; track i) {
            <div class="grid grid-cols-12 gap-4 px-6 py-3">
              <div class="col-span-3 h-3 bg-editorial-text/5 rounded-none"></div>
              <div class="col-span-3 h-3 bg-editorial-text/5 rounded-none"></div>
              <div class="col-span-2 h-3 bg-editorial-text/5 rounded-none"></div>
              <div class="col-span-2 h-3 bg-editorial-text/5 rounded-none"></div>
              <div class="col-span-2 h-3 bg-editorial-text/5 rounded-none"></div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AuditLogComponent extends BaseComponent {
  entries = signal<AuditEntry[]>([]);
}
