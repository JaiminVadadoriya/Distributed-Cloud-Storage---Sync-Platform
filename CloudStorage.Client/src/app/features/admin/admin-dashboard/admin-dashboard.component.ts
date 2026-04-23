import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BaseComponent } from '../../../core/models/base-component';
import { AdminService, AdminStats, SystemHealth } from '../../../core/services/admin.service';
import { takeUntil } from 'rxjs/operators';
import { forkJoin, interval } from 'rxjs';
import { formatBytes } from '../../../core/utils/format.utils';
import { SparklineComponent } from '../../../shared/components/sparkline/sparkline.component';
import { TrafficMapComponent } from '../../../shared/components/traffic-map/traffic-map.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SparklineComponent, TrafficMapComponent],
  template: `
    <div class="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <!-- Header -->
      <header class="pb-10 border-b-2 border-editorial-text flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="space-y-3">
          <p class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/30 italic">CloudStorage / Control_Plane</p>
          <h1 class="text-6xl md:text-7xl font-sans font-black tracking-tighter text-editorial-text uppercase italic leading-none">Admin_Overview</h1>
          <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/50">Platform health &amp; user telemetry at a glance</p>
        </div>
        <div class="flex items-center gap-3">
          @if (health()?.status === 'healthy') {
            <div class="flex items-center gap-2 px-5 py-3 border border-emerald-500/30 bg-emerald-500/5 text-emerald-500">
              <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span class="font-mono text-[10px] uppercase tracking-widest font-bold">All_Systems_Go</span>
            </div>
          } @else if (health()?.status === 'degraded') {
            <div class="flex items-center gap-2 px-5 py-3 border border-amber-500/30 bg-amber-500/5 text-amber-500">
              <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span class="font-mono text-[10px] uppercase tracking-widest font-bold">Degraded</span>
            </div>
          } @else {
            <div class="flex items-center gap-2 px-5 py-3 border border-rose-500/30 bg-rose-500/5 text-rose-500">
              <div class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
              <span class="font-mono text-[10px] uppercase tracking-widest font-bold">Critical</span>
            </div>
          }
        </div>
      </header>

      <!-- KPI Grid -->
      @if (stats(); as s) {
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-editorial-text/10 border border-editorial-text/10">
          @for (kpi of kpis(s); track kpi.label) {
            <div class="bg-editorial-bg p-8 space-y-4 hover:bg-editorial-text/[0.02] transition-all group relative overflow-hidden">
              <div class="flex items-start justify-between">
                <div class="font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/30 italic">{{ kpi.label }}</div>
                @if (kpi.trend) {
                  <div class="font-mono text-[8px] flex items-center gap-1"
                       [class.text-emerald-500]="kpi.trend > 0"
                       [class.text-rose-500]="kpi.trend < 0">
                    {{ kpi.trend > 0 ? '+' : '' }}{{ kpi.trend }}%
                    <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                         [class.rotate-0]="kpi.trend > 0" [class.rotate-180]="kpi.trend < 0">
                      <path d="M5 10l7-7 7 7M12 3v18" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                }
              </div>
              <div class="text-4xl font-sans font-black tracking-tighter text-editorial-text uppercase leading-none">{{ kpi.value }}</div>
              
              <!-- Mini Sparkline for KPIs -->
              <div class="h-8 -mx-4 opacity-40 group-hover:opacity-100 transition-opacity">
                 <app-sparkline [data]="kpi.spark" [color]="'currentColor'" [showLastPoint]="false"></app-sparkline>
              </div>

              @if (kpi.sub) {
                <div class="font-mono text-[9px] text-editorial-text/30 uppercase tracking-widest">{{ kpi.sub }}</div>
              }
            </div>
          }
        </section>
      } @else if (isBusy()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-editorial-text/10 border border-editorial-text/10">
          @for (i of [1,2,3,4,5,6,7,8]; track i) {
            <div class="bg-editorial-bg p-8 animate-pulse">
              <div class="h-3 bg-editorial-text/5 mb-4 w-24"></div>
              <div class="h-10 bg-editorial-text/10 w-20"></div>
            </div>
          }
        </div>
      }

      <!-- Regional Traffic Map -->
      <section class="space-y-6">
        <h2 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 pb-4 border-b border-editorial-text/10">Production_Global_Telemetry</h2>
        <app-traffic-map [externalNodes]="stats()?.regionalTraffic ?? null"></app-traffic-map>
      </section>

      <!-- Quick Actions + Health Snapshot -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <!-- Quick Actions -->
        <div class="lg:col-span-1 space-y-4">
          <h2 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 pb-4 border-b border-editorial-text/10">Quick_Actions</h2>
          <a routerLink="/admin/users" class="flex items-center justify-between p-5 border border-editorial-text/10 hover:border-editorial-text hover:bg-editorial-text/[0.03] transition-all group">
            <div class="space-y-1">
              <div class="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-editorial-text group-hover:text-editorial-text">Manage_Users</div>
              <div class="font-mono text-[9px] text-editorial-text/30 uppercase tracking-widest">{{ stats()?.totalUsers ?? '—' }} total accounts</div>
            </div>
            <svg class="w-4 h-4 text-editorial-text/20 group-hover:text-editorial-text group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
          <a routerLink="/admin/health" class="flex items-center justify-between p-5 border border-editorial-text/10 hover:border-editorial-text hover:bg-editorial-text/[0.03] transition-all group">
            <div class="space-y-1">
              <div class="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-editorial-text">System_Health</div>
              <div class="font-mono text-[9px] text-editorial-text/30 uppercase tracking-widest">{{ health()?.activeConnections ?? '—' }} active connections</div>
            </div>
            <svg class="w-4 h-4 text-editorial-text/20 group-hover:text-editorial-text group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
          <a routerLink="/admin/audit" class="flex items-center justify-between p-5 border border-editorial-text/10 hover:border-editorial-text hover:bg-editorial-text/[0.03] transition-all group">
            <div class="space-y-1">
              <div class="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-editorial-text">Audit_Logs</div>
              <div class="font-mono text-[9px] text-editorial-text/30 uppercase tracking-widest">Security &amp; access events</div>
            </div>
            <svg class="w-4 h-4 text-editorial-text/20 group-hover:text-editorial-text group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>

        <!-- Health Checks Snapshot -->
        <div class="lg:col-span-2 space-y-4">
          <h2 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 pb-4 border-b border-editorial-text/10">Service_Health_Snapshot</h2>
          @if (health(); as h) {
            <div class="space-y-2">
              @for (check of h.checks; track check.name) {
                <div class="flex items-center gap-4 p-4 border border-editorial-text/5 hover:border-editorial-text/10 transition-colors">
                  <div class="w-2 h-2 rounded-full flex-shrink-0"
                       [class.bg-emerald-500]="check.status === 'ok'"
                       [class.bg-amber-500]="check.status === 'warn'"
                       [class.bg-rose-500]="check.status === 'error'"></div>
                  <div class="flex-1 min-w-0">
                    <div class="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-editorial-text">{{ check.name }}</div>
                    <div class="font-mono text-[9px] text-editorial-text/40 truncate">{{ check.message }}</div>
                  </div>
                  @if (check.latencyMs !== undefined) {
                    <div class="font-mono text-[9px] text-editorial-text/30 tabular-nums flex-shrink-0">{{ check.latencyMs }}ms</div>
                  }
                  <div class="px-2 py-0.5 border text-[8px] font-mono uppercase tracking-widest flex-shrink-0"
                       [class.border-emerald-500/30]="check.status === 'ok'"
                       [class.text-emerald-500]="check.status === 'ok'"
                       [class.border-amber-500/30]="check.status === 'warn'"
                       [class.text-amber-500]="check.status === 'warn'"
                       [class.border-rose-500/30]="check.status === 'error'"
                       [class.text-rose-500]="check.status === 'error'">{{ check.status }}</div>
                </div>
              }
            </div>
          } @else {
            <div class="space-y-2">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="h-14 bg-editorial-text/[0.02] animate-pulse border border-editorial-text/5"></div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Storage Distribution Bar -->
      @if (stats(); as s) {
        <section class="space-y-6 border-t border-editorial-text/10 pt-12">
          <div class="flex justify-between items-end">
            <h2 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40">Platform_Storage_Utilization</h2>
            <span class="font-mono text-[10px] text-editorial-text/50 uppercase tracking-widest">{{ formatBytes(s.totalStorageUsed) }} / {{ formatBytes(s.totalStorageLimit) }}</span>
          </div>
          <div class="h-3 bg-editorial-text/5 overflow-hidden border border-editorial-text/5">
            <div class="h-full bg-editorial-text transition-all duration-1000"
                 [style.width.%]="storagePercent(s)"></div>
          </div>
          <div class="grid grid-cols-3 gap-px bg-editorial-text/5 border border-editorial-text/5">
            <div class="bg-editorial-bg p-5">
              <div class="font-mono text-[9px] uppercase tracking-[0.3em] text-editorial-text/30">Today_Uploads</div>
              <div class="text-2xl font-black tracking-tighter mt-2">{{ s.uploadsToday }}</div>
            </div>
            <div class="bg-editorial-bg p-5">
              <div class="font-mono text-[9px] uppercase tracking-[0.3em] text-editorial-text/30">Today_Downloads</div>
              <div class="text-2xl font-black tracking-tighter mt-2">{{ s.downloadsToday }}</div>
            </div>
            <div class="bg-editorial-bg p-5">
              <div class="font-mono text-[9px] uppercase tracking-[0.3em] text-editorial-text/30">Active_Sessions_Now</div>
              <div class="text-2xl font-black tracking-tighter mt-2">{{ s.activeSessionsNow }}</div>
            </div>
          </div>
        </section>
      }

      <footer class="pt-12 opacity-20 flex justify-between items-center text-[8px] font-mono uppercase tracking-[0.5em] pb-10">
        <span>Admin_Plane: ARC_V21</span>
        <div class="h-[1px] flex-1 bg-editorial-text/10 mx-16"></div>
        <span>{{ now | date:'yyyy.MM.dd_HH:mm' }}</span>
      </footer>
    </div>
  `
})
export class AdminDashboardComponent extends BaseComponent implements OnInit {
  private adminService = inject(AdminService);
  stats = signal<AdminStats | null>(null);
  health = signal<SystemHealth | null>(null);
  now = new Date();
  formatBytes = formatBytes;

  ngOnInit() {
    this.isBusy.set(true);

    forkJoin({
      stats: this.adminService.getAdminStats(),
      health: this.adminService.getSystemHealth()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ stats, health }) => {
        this.stats.set(stats);
        this.health.set(health);
        this.isBusy.set(false);
      },
      error: (err) => {
        console.error('Admin Dashboard load failed:', err);
        this.isBusy.set(false);
      }
    });

    // Refresh telemetry every minute
    interval(60000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.adminService.getSystemHealth().pipe(takeUntil(this.destroy$)).subscribe(h => this.health.set(h));
    });
  }

  kpis(s: AdminStats) {
    return [
      { label: 'Total_Users', value: s.totalUsers.toLocaleString(), sub: `${s.activeUsersLast24h} active`, trend: s.usersTrend, spark: s.trafficHistory }, // Use traffic history as proxy for user activity
      { label: 'Suspended', value: s.suspendedUsers.toLocaleString(), sub: 'accounts', trend: 0, spark: [] },
      { label: 'Total_Files', value: s.totalFiles.toLocaleString(), sub: null, trend: s.filesTrend, spark: [] },
      { label: 'New_This_Week', value: `+${s.newUsersThisWeek}`, sub: 'users', trend: 0, spark: [] },
      { label: 'Storage_Used', value: formatBytes(s.totalStorageUsed), sub: formatBytes(s.totalStorageLimit) + ' cap', trend: s.storageTrend, spark: s.storageHistory },
      { label: 'Uploads_Today', value: s.uploadsToday.toLocaleString(), sub: 'file ops', trend: 0, spark: [] },
      { label: 'Downloads_Today', value: s.downloadsToday.toLocaleString(), sub: 'file ops', trend: 0, spark: [] },
      { label: 'Active_Sessions', value: s.activeSessionsNow.toLocaleString(), sub: 'online now', trend: 0, spark: s.trafficHistory },
    ];
  }

  storagePercent(s: AdminStats): number {
    if (!s.totalStorageLimit) return 0;
    return Math.round((s.totalStorageUsed / s.totalStorageLimit) * 100);
  }
}
