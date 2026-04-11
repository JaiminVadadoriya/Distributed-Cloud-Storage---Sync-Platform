import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../../core/models/base-component';
import { AdminService } from '../../../core/services/admin.service';
import { AuditEntry } from '../../../core/models/audit.model';
import { takeUntil } from 'rxjs/operators';

const ACTION_COLORS: Record<string, string> = {
  USER_SUSPEND: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
  USER_REGISTER: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5',
  USER_LOGIN: 'text-editorial-text/50 border-editorial-text/10',
  USER_LOGIN_FAIL: 'text-rose-500 border-rose-500/30 bg-rose-500/5',
  FILE_DELETE: 'text-rose-500 border-rose-500/20',
  FILE_UPLOAD: 'text-editorial-text/50 border-editorial-text/10',
  FILE_SHARE: 'text-editorial-text/50 border-editorial-text/10',
  ROLE_CHANGE: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
  CONFIG_CHANGE: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
  SYSTEM_RESTART: 'text-rose-500 border-rose-500/30 bg-rose-500/5',
};

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <!-- Header -->
      <header class="pb-10 border-b-2 border-editorial-text flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="space-y-3">
          <p class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/30 italic">Admin / Monitoring</p>
          <h1 class="text-5xl md:text-6xl font-sans font-black tracking-tighter uppercase italic leading-none">Audit_Logs</h1>
          <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/50">Immutable security events &amp; compliance trail</p>
        </div>
        <div class="flex items-center gap-3">
          @if (isBusy()) {
            <div class="w-4 h-4 border border-editorial-text/30 border-t-editorial-text rounded-full animate-spin"></div>
          }
          <button (click)="exportCsv()" class="px-5 py-3 border border-editorial-text/20 font-mono text-[9px] uppercase tracking-widest hover:bg-editorial-text hover:text-editorial-bg hover:border-editorial-text transition-all">
            Export_CSV
          </button>
          <div class="px-4 py-3 border border-editorial-text/10 font-mono text-[9px] uppercase tracking-widest text-editorial-text/40">
            {{ filtered().length }}_Events
          </div>
        </div>
      </header>

      <!-- Filters -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <!-- Search -->
        <div class="relative">
          <input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
                 placeholder="Search events..."
                 class="w-full bg-transparent border border-editorial-text/20 px-5 py-3.5 font-mono text-xs uppercase tracking-widest text-editorial-text placeholder:text-editorial-text/20 focus:outline-none focus:border-editorial-text transition-colors" />
        </div>

        <!-- Action Filter -->
        <select [ngModel]="actionFilter()" (ngModelChange)="actionFilter.set($event)"
                class="bg-editorial-bg border border-editorial-text/20 px-5 py-3.5 font-mono text-[10px] uppercase tracking-widest text-editorial-text/60 focus:outline-none focus:border-editorial-text transition-colors">
          <option value="">All_Actions</option>
          @for (a of availableActions(); track a) {
            <option [value]="a">{{ a }}</option>
          }
        </select>

        <!-- Target Type Filter -->
        <select [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)"
                class="bg-editorial-bg border border-editorial-text/20 px-5 py-3.5 font-mono text-[10px] uppercase tracking-widest text-editorial-text/60 focus:outline-none focus:border-editorial-text transition-colors">
          <option value="">All_Types</option>
          <option value="user">User</option>
          <option value="file">File</option>
          <option value="folder">Folder</option>
          <option value="system">System</option>
        </select>

        <!-- Clear -->
        <button (click)="clearFilters()"
                class="px-5 py-3 border border-editorial-text/10 font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 hover:border-editorial-text hover:text-editorial-text transition-all">
          Clear_Filters
        </button>
      </div>

      <!-- Active filter chips -->
      @if (activeFilterCount() > 0) {
        <div class="flex flex-wrap gap-2">
          @if (searchQuery()) {
            <span class="inline-flex items-center gap-2 px-3 py-1.5 border border-editorial-text/20 font-mono text-[8px] uppercase tracking-widest">
              Search: {{ searchQuery() }}
              <button (click)="searchQuery.set('')" class="hover:text-editorial-text">✕</button>
            </span>
          }
          @if (actionFilter()) {
            <span class="inline-flex items-center gap-2 px-3 py-1.5 border border-editorial-text/20 font-mono text-[8px] uppercase tracking-widest">
              Action: {{ actionFilter() }}
              <button (click)="actionFilter.set('')" class="hover:text-editorial-text">✕</button>
            </span>
          }
          @if (typeFilter()) {
            <span class="inline-flex items-center gap-2 px-3 py-1.5 border border-editorial-text/20 font-mono text-[8px] uppercase tracking-widest">
              Type: {{ typeFilter() }}
              <button (click)="typeFilter.set('')" class="hover:text-editorial-text">✕</button>
            </span>
          }
        </div>
      }

      <!-- Event Timeline Table -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-editorial-text/20">
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6 w-36">Timestamp</th>
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6">Action</th>
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6 hidden md:table-cell">Performed_By</th>
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6 hidden lg:table-cell">Target</th>
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6 hidden xl:table-cell">Details</th>
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 hidden sm:table-cell">Source_IP</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-editorial-text/5">
            @for (entry of filtered(); track entry.id) {
              <tr class="group hover:bg-editorial-text/[0.02] transition-colors"
                  [class.border-l-2]="isCritical(entry)"
                  [class.border-rose-500]="isCritical(entry)">
                <!-- Timestamp -->
                <td class="py-5 pr-6">
                  <div class="font-mono text-[9px] text-editorial-text/50 italic tabular-nums whitespace-nowrap">{{ entry.performedAt | date:'MM.dd HH:mm:ss' }}</div>
                </td>

                <!-- Action badge -->
                <td class="py-5 pr-6">
                  <span class="px-2.5 py-1 border text-[8px] font-mono font-bold uppercase tracking-widest whitespace-nowrap"
                        [class]="actionColor(entry.action)">
                    {{ entry.action }}
                  </span>
                </td>

                <!-- Performed by -->
                <td class="py-5 pr-6 hidden md:table-cell">
                  <span class="font-mono text-[10px] font-bold text-editorial-text uppercase tracking-widest">{{ entry.performedBy }}</span>
                </td>

                <!-- Target -->
                <td class="py-5 pr-6 hidden lg:table-cell">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 border border-editorial-text/10 text-[7px] font-mono uppercase tracking-widest text-editorial-text/30">{{ entry.targetType }}</span>
                    <span class="font-sans text-xs text-editorial-text/70 truncate max-w-[180px]" [title]="entry.targetName">{{ entry.targetName }}</span>
                  </div>
                </td>

                <!-- Details -->
                <td class="py-5 pr-6 hidden xl:table-cell">
                  @if (entry.details) {
                    <span class="font-mono text-[9px] text-editorial-text/30 italic truncate max-w-[200px] block" [title]="entry.details">{{ entry.details }}</span>
                  } @else {
                    <span class="text-editorial-text/10 font-mono text-[9px]">—</span>
                  }
                </td>

                <!-- IP -->
                <td class="py-5 hidden sm:table-cell">
                  <span class="font-mono text-[9px] text-editorial-text/25 tabular-nums">{{ entry.ipAddress ?? '—' }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="py-32 text-center">
                  <p class="font-mono text-[10px] uppercase tracking-[0.6em] text-editorial-text/10">Null_Sequence: No_Matching_Events</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <footer class="flex justify-between items-center pt-6 border-t border-editorial-text/10 text-editorial-text/20 font-mono text-[8px] uppercase tracking-[0.4em]">
        <span>Audit_Chain: Verified</span>
        <span>{{ filtered().length }} events shown</span>
      </footer>
    </div>
  `
})
export class AdminAuditComponent extends BaseComponent implements OnInit {
  private adminService = inject(AdminService);
  public entries = signal<AuditEntry[]>([]);
  public searchQuery = signal('');
  public actionFilter = signal('');
  public typeFilter = signal('');

  public filtered = computed(() => {
    const list = this.entries();
    const q = this.searchQuery().toLowerCase().trim();
    const action = this.actionFilter();
    const type = this.typeFilter();

    return list.filter(e => {
      const matchesSearch = !q || 
        e.action.toLowerCase().includes(q) ||
        e.performedBy.toLowerCase().includes(q) ||
        e.targetName.toLowerCase().includes(q) ||
        (e.details ?? '').toLowerCase().includes(q) ||
        (e.ipAddress ?? '').includes(q);
      
      const matchesAction = !action || e.action === action;
      const matchesType = !type || e.targetType === type;

      return matchesSearch && matchesAction && matchesType;
    });
  });

  availableActions = computed(() => {
    const actions = [...new Set(this.entries().map(e => e.action))].sort();
    return actions;
  });

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchQuery()) count++;
    if (this.actionFilter()) count++;
    if (this.typeFilter()) count++;
    return count;
  });

  ngOnInit() {
    this.loadLogs();
  }

  private loadLogs() {
    this.isBusy.set(true);
    this.adminService.getAuditLogs(100).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.entries.set(data);
        this.isBusy.set(false);
      },
      error: () => this.isBusy.set(false)
    });
  }

  clearFilters() {
    this.searchQuery.set('');
    this.actionFilter.set('');
    this.typeFilter.set('');
  }

  actionColor(action: string): string {
    return ACTION_COLORS[action] ?? 'text-editorial-text/40 border-editorial-text/10';
  }

  isCritical(entry: AuditEntry): boolean {
    return ['USER_SUSPEND', 'USER_LOGIN_FAIL', 'SYSTEM_RESTART', 'ROLE_CHANGE'].includes(entry.action);
  }

  exportCsv() {
    const headers = ['timestamp', 'action', 'performedBy', 'targetType', 'targetName', 'ipAddress', 'details'];
    const rows = this.filtered().map(e => [
      e.performedAt, e.action, e.performedBy, e.targetType, `"${e.targetName}"`, e.ipAddress ?? '', `"${e.details ?? ''}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
