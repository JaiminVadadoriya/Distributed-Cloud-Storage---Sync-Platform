import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { AdminService, SystemHealth } from '../../../core/services/admin.service';
import { takeUntil } from 'rxjs/operators';
import { interval, Subscription } from 'rxjs';
import { formatBytes } from '../../../core/utils/format.utils';
import { SparklineComponent } from '../../../shared/components/sparkline/sparkline.component';

@Component({
  selector: 'app-system-health',
  standalone: true,
  imports: [CommonModule, SparklineComponent],
  template: `
    <div class="space-y-14 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <!-- Header -->
      <header class="pb-10 border-b-2 border-editorial-text flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="space-y-3">
          <p class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/30 italic">Admin / Monitoring</p>
          <h1 class="text-5xl md:text-6xl font-sans font-black tracking-tighter uppercase italic leading-none">System_Health</h1>
          <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/50">Real-time cluster telemetry &amp; service diagnostics</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          @if (health(); as h) {
            <div class="flex items-center gap-2 px-5 py-3 border"
                 [class.border-emerald-500/30]="h.status === 'healthy'"
                 [class.bg-emerald-500/5]="h.status === 'healthy'"
                 [class.text-emerald-500]="h.status === 'healthy'"
                 [class.border-amber-500/30]="h.status === 'degraded'"
                 [class.bg-amber-500/5]="h.status === 'degraded'"
                 [class.text-amber-500]="h.status === 'degraded'"
                 [class.border-rose-500/30]="h.status === 'critical'"
                 [class.bg-rose-500/5]="h.status === 'critical'"
                 [class.text-rose-500]="h.status === 'critical'">
              <div class="w-2 h-2 rounded-full bg-current animate-pulse"></div>
              <span class="font-mono text-[10px] uppercase tracking-widest font-bold">{{ h.status }}</span>
            </div>
            <span class="font-mono text-[9px] uppercase tracking-[0.3em] text-editorial-text/30">Uptime: {{ formatUptime(h.uptime) }}</span>
          }
          <div class="font-mono text-[8px] text-editorial-text/20 uppercase tracking-widest">Auto-refreshes every 30s</div>
        </div>
      </header>

      <!-- Core Metrics -->
      @if (health(); as h) {

        <!-- Gauge Row -->
        <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-editorial-text/5 border border-editorial-text/5">

          <!-- CPU -->
          <div class="bg-editorial-bg p-8 space-y-5 relative overflow-hidden group">
            <div class="font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/30 italic">CPU_Load</div>
            <div class="relative h-2 bg-editorial-text/5 overflow-hidden">
              <div class="absolute inset-y-0 left-0 transition-all duration-1000"
                   [style.width.%]="h.cpuUsage"
                   [class.bg-editorial-text]="h.cpuUsage < 70"
                   [class.bg-amber-500]="h.cpuUsage >= 70 && h.cpuUsage < 90"
                   [class.bg-rose-500]="h.cpuUsage >= 90"></div>
            </div>
            <div class="flex items-end justify-between">
              <div class="text-4xl font-black tracking-tighter">{{ h.cpuUsage.toFixed(1) }}<span class="text-base text-editorial-text/30 font-mono ml-1">%</span></div>
              <div class="h-10 w-24 opacity-20 group-hover:opacity-100 transition-opacity">
                 <app-sparkline [data]="mockCpuHistory" [color]="'currentColor'" [showLastPoint]="false"></app-sparkline>
              </div>
            </div>
          </div>

          <!-- Memory -->
          <div class="bg-editorial-bg p-8 space-y-5">
            <div class="font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/30 italic">Memory_Used</div>
            <div class="relative h-2 bg-editorial-text/5 overflow-hidden">
              <div class="absolute inset-y-0 left-0 transition-all duration-1000 bg-editorial-text"
                   [style.width.%]="memPercent(h)"
                   [class.bg-editorial-text]="memPercent(h) < 70"
                   [class.bg-amber-500]="memPercent(h) >= 70 && memPercent(h) < 90"
                   [class.bg-rose-500]="memPercent(h) >= 90"></div>
            </div>
            <div class="text-4xl font-black tracking-tighter">{{ memPercent(h) }}<span class="text-base text-editorial-text/30 font-mono ml-1">%</span></div>
            <div class="font-mono text-[8px] text-editorial-text/30 uppercase tracking-widest">{{ formatBytes(h.memoryUsed) }} / {{ formatBytes(h.memoryTotal) }}</div>
          </div>

          <!-- Disk -->
          <div class="bg-editorial-bg p-8 space-y-5">
            <div class="font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/30 italic">Disk_Utilization</div>
            <div class="relative h-2 bg-editorial-text/5 overflow-hidden">
              <div class="absolute inset-y-0 left-0 transition-all duration-1000"
                   [style.width.%]="diskPercent(h)"
                   [class.bg-editorial-text]="diskPercent(h) < 70"
                   [class.bg-amber-500]="diskPercent(h) >= 70 && diskPercent(h) < 90"
                   [class.bg-rose-500]="diskPercent(h) >= 90"></div>
            </div>
            <div class="text-4xl font-black tracking-tighter">{{ diskPercent(h) }}<span class="text-base text-editorial-text/30 font-mono ml-1">%</span></div>
            <div class="font-mono text-[8px] text-editorial-text/30 uppercase tracking-widest">{{ formatBytes(h.diskUsed) }} / {{ formatBytes(h.diskTotal) }}</div>
          </div>

          <!-- Response Time -->
          <div class="bg-editorial-bg p-8 space-y-5">
            <div class="font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/30 italic">Avg_Response</div>
            <div class="relative h-2 bg-editorial-text/5 overflow-hidden">
              <div class="absolute inset-y-0 left-0 transition-all duration-1000 bg-editorial-text"
                   [style.width.%]="Math.min(h.avgResponseMs / 5, 100)"
                   [class.bg-editorial-text]="h.avgResponseMs < 100"
                   [class.bg-amber-500]="h.avgResponseMs >= 100 && h.avgResponseMs < 300"
                   [class.bg-rose-500]="h.avgResponseMs >= 300"></div>
            </div>
            <div class="text-4xl font-black tracking-tighter">{{ h.avgResponseMs }}<span class="text-base text-editorial-text/30 font-mono ml-1">ms</span></div>
          </div>
        </section>

        <!-- Secondary stats row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-editorial-text/5 border border-editorial-text/5">
          <div class="bg-editorial-bg p-6">
            <div class="font-mono text-[8px] uppercase tracking-[0.4em] text-editorial-text/30">Active_Connections</div>
            <div class="text-3xl font-black tracking-tighter mt-3">{{ h.activeConnections }}</div>
          </div>
          <div class="bg-editorial-bg p-6">
            <div class="font-mono text-[8px] uppercase tracking-[0.4em] text-editorial-text/30">Req/Min</div>
            <div class="text-3xl font-black tracking-tighter mt-3">{{ h.requestsPerMinute.toLocaleString() }}</div>
          </div>
          <div class="bg-editorial-bg p-6">
            <div class="font-mono text-[8px] uppercase tracking-[0.4em] text-editorial-text/30">Error_Rate</div>
            <div class="text-3xl font-black tracking-tighter mt-3"
                 [class.text-emerald-500]="h.errorRate < 1"
                 [class.text-amber-500]="h.errorRate >= 1 && h.errorRate < 5"
                 [class.text-rose-500]="h.errorRate >= 5">
              {{ h.errorRate.toFixed(2) }}<span class="text-sm font-mono ml-1 text-editorial-text/30">%</span>
            </div>
          </div>
          <div class="bg-editorial-bg p-6">
            <div class="font-mono text-[8px] uppercase tracking-[0.4em] text-editorial-text/30">Uptime</div>
            <div class="text-3xl font-black tracking-tighter mt-3 text-emerald-500">{{ formatUptime(h.uptime) }}</div>
          </div>
        </div>

        <!-- Realtime Spectral (live bars from random data simulating I/O) -->
        <section class="space-y-6">
          <h2 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 pb-4 border-b border-editorial-text/10">IO_Throughput_Spectral</h2>
          <div class="h-36 flex items-end gap-px overflow-hidden border border-editorial-text/5 bg-editorial-text/[0.01] px-4 pb-4 pt-8">
            @for (bar of spectral(); track $index) {
              <div class="flex-1 bg-editorial-text transition-all duration-700"
                   [style.height.%]="bar"
                   [style.opacity]="0.08 + (bar / 200)"></div>
            }
          </div>
        </section>

        <!-- Service Checks -->
        <section class="space-y-6">
          <h2 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 pb-4 border-b border-editorial-text/10">Service_Check_Matrix</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (check of h.checks; track check.name) {
              <div class="p-6 border transition-colors"
                   [class.border-emerald-500/20]="check.status === 'ok'"
                   [class.border-amber-500/20]="check.status === 'warn'"
                   [class.border-rose-500/20]="check.status === 'error'"
                   [class.bg-emerald-500/[0.02]]="check.status === 'ok'"
                   [class.bg-amber-500/[0.02]]="check.status === 'warn'"
                   [class.bg-rose-500/[0.02]]="check.status === 'error'">
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-2 min-w-0">
                    <div class="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-editorial-text">{{ check.name }}</div>
                    <div class="font-mono text-[9px] text-editorial-text/40 leading-relaxed">{{ check.message }}</div>
                  </div>
                  <div class="flex-shrink-0 flex flex-col items-end gap-2">
                    <div class="px-3 py-1 border text-[8px] font-mono uppercase tracking-widest font-bold"
                         [class.border-emerald-500/40]="check.status === 'ok'"
                         [class.text-emerald-500]="check.status === 'ok'"
                         [class.border-amber-500/40]="check.status === 'warn'"
                         [class.text-amber-500]="check.status === 'warn'"
                         [class.border-rose-500/40]="check.status === 'error'"
                         [class.text-rose-500]="check.status === 'error'">{{ check.status }}</div>
                    @if (check.latencyMs !== undefined) {
                      <span class="font-mono text-[8px] text-editorial-text/20">{{ check.latencyMs }}ms</span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </section>

      } @else if (isBusy()) {
        <div class="grid grid-cols-4 gap-px bg-editorial-text/5 border border-editorial-text/5">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-editorial-bg p-8 animate-pulse">
              <div class="h-2 bg-editorial-text/5 mb-6 w-28"></div>
              <div class="h-12 bg-editorial-text/10 w-20"></div>
            </div>
          }
        </div>
      }

      <footer class="pt-12 opacity-20 flex justify-between items-center text-[8px] font-mono uppercase tracking-[0.5em] pb-10">
        <span>Cluster: EU-CENTRAL-1</span>
        <div class="h-[1px] flex-1 bg-editorial-text/10 mx-16"></div>
        <span>Kernel: EX-CORE-V21</span>
      </footer>
    </div>
  `
})
export class SystemHealthComponent extends BaseComponent implements OnInit {
  private adminService = inject(AdminService);
  health = signal<SystemHealth | null>(null);
  spectral = signal<number[]>([]);
  
  // Mock history for sparklines
  mockCpuHistory = [40, 45, 42, 48, 55, 60, 52];
  mockMemHistory = [68, 70, 72, 70, 69, 71, 72];
  mockDiskHistory = [82, 82, 83, 83, 83, 84, 84];
  mockRespHistory = [25, 28, 30, 24, 22, 28, 30];
  Math = Math;
  formatBytes = formatBytes;
  private refreshSub?: Subscription;

  ngOnInit() {
    this.loadHealth();
    this.spectral.set(Array.from({ length: 80 }, () => Math.floor(Math.random() * 80) + 10));
    // Animate spectral
    this.refreshSub = interval(800).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.spectral.update((data: number[]) => [...data.slice(1), Math.floor(Math.random() * 80) + 10]);
    });
    // Refresh health every 30s
    interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => this.loadHealth());
  }

  private loadHealth() {
    this.isBusy.set(true);
    this.adminService.getSystemHealth().pipe(takeUntil(this.destroy$)).subscribe({
      next: (h: SystemHealth) => { this.health.set(h); this.isBusy.set(false); },
      error: () => this.isBusy.set(false)
    });
  }

  memPercent(h: SystemHealth) { return Math.round((h.memoryUsed / h.memoryTotal) * 100); }
  diskPercent(h: SystemHealth) { return Math.round((h.diskUsed / h.diskTotal) * 100); }
  formatUptime(s: number): string {
    const days = Math.floor(s / 86400);
    const hrs = Math.floor((s % 86400) / 3600);
    const min = Math.floor((s % 3600) / 60);
    return `${days}d ${hrs}h ${min}m`;
  }
}
