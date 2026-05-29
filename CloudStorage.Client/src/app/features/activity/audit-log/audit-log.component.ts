import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { AuditEntry } from '../../../core/models/file.model';
import { ActivityService } from '../../../core/services/activity.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-12 animate-in fade-in duration-700 selection:bg-editorial-text selection:text-editorial-bg">
      <div class="pb-8 border-b border-editorial-text/20 flex justify-between items-end">
        <div class="space-y-2">
          <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase italic">Security_Archive</h1>
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60 mt-2">Historical encryption & access state records</p>
        </div>
        @if (isBusy()) {
           <div class="w-4 h-4 border border-editorial-text/20 border-t-editorial-text rounded-full animate-spin"></div>
        }
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-editorial-text/20 text-left">
              <th class="py-4 font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/40">Timestamp</th>
              <th class="py-4 font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/40">Node_Agent</th>
              <th class="py-4 font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/40">Action</th>
              <th class="py-4 font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/40">Object_Ident</th>
              <th class="py-4 font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/40">Source_IP</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-editorial-text/5">
            @for (entry of entries(); track entry.id) {
              <tr class="group hover:bg-editorial-text/[0.02] transition-colors">
                <td class="py-6 font-mono text-[10px] text-editorial-text/60 italic">{{ entry.performedAt | date:'MM.dd_HH:mm:ss' }}</td>
                <td class="py-6">
                  <span class="font-mono text-[10px] font-bold text-editorial-text uppercase tracking-widest">{{ entry.performedBy }}</span>
                </td>
                <td class="py-6">
                   <span class="px-2 py-0.5 border border-editorial-text/10 text-[8px] font-mono uppercase tracking-widest bg-editorial-text/[0.02]">
                     {{ entry.action }}
                   </span>
                </td>
                <td class="py-6">
                  <span class="font-sans text-xs font-bold text-editorial-text uppercase tracking-tight">{{ entry.targetName }}</span>
                </td>
                <td class="py-6 font-mono text-[10px] text-editorial-text/30">{{ entry.ipAddress || '---' }}</td>
              </tr>
            } @empty {
              @if (!isBusy()) {
                <tr>
                  <td colspan="5" class="py-32 text-center">
                    <p class="font-mono text-[10px] uppercase tracking-[0.6em] text-editorial-text/10">Null_Sequence: No_Security_Records</p>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <footer class="pt-12 flex justify-between items-center opacity-20 group hover:opacity-100 transition-opacity duration-1000">
         <span class="font-mono text-[8px] uppercase tracking-[0.4em]">Audit_Chain: Verified</span>
         <div class="h-[1px] flex-1 bg-editorial-text/10 mx-8"></div>
         <span class="font-mono text-[8px] uppercase tracking-[0.4em]">Sequence: Hex_Hash_Binding</span>
      </footer>
    </div>
  `
})
export class AuditLogComponent extends BaseComponent implements OnInit {
  private activityService = inject(ActivityService);
  entries = signal<AuditEntry[]>([]);

  ngOnInit() {
    this.loadAudit();
  }

  private loadAudit() {
    this.isBusy.set(true);
    this.activityService.getRecentActivity('system', 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.entries.set(data);
          this.isBusy.set(false);
        },
        error: () => this.isBusy.set(false)
      });
  }
}
