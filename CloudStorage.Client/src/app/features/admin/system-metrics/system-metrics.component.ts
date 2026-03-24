import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';

@Component({
  selector: 'app-system-metrics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-12">
      <div class="pb-8 border-b border-editorial-text/20">
        <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">System_Metrics</h1>
        <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60 mt-2">Infrastructure health and performance</p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-0 border border-editorial-text/20">
        <div class="p-10 border-b md:border-b-0 md:border-r border-editorial-text/20 space-y-4">
          <span class="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-editorial-text/70">API_Response_Time</span>
          <div class="text-3xl font-bold font-mono text-editorial-text">47ms</div>
          <div class="text-[9px] font-mono text-editorial-text/40 uppercase">p95 latency</div>
        </div>
        <div class="p-10 border-b md:border-b-0 md:border-r border-editorial-text/20 space-y-4">
          <span class="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-editorial-text/70">Upload_Throughput</span>
          <div class="text-3xl font-bold font-mono text-editorial-text">12.4 MB/s</div>
          <div class="text-[9px] font-mono text-editorial-text/40 uppercase">avg last 24h</div>
        </div>
        <div class="p-10 space-y-4">
          <span class="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-editorial-text/70">Error_Rate</span>
          <div class="text-3xl font-bold font-mono text-editorial-text">0.02%</div>
          <div class="text-[9px] font-mono text-editorial-text/40 uppercase">last 7 cycles</div>
        </div>
      </div>

      <!-- Grafana Placeholder -->
      <div class="border border-editorial-text/10 bg-editorial-text/[0.01] p-10 space-y-6">
        <div class="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-editorial-text/50">Monitoring_Dashboard</div>
        <div class="aspect-video bg-editorial-text/[0.02] border border-editorial-text/5 flex items-center justify-center">
          <div class="text-center space-y-3">
            <div class="text-editorial-text/15 text-5xl font-mono">&#9632;&#9632;&#9632;</div>
            <p class="text-[9px] font-mono uppercase tracking-widest text-editorial-text/30">Grafana Embed: Connect monitoring service to enable</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SystemMetricsComponent extends BaseComponent {}
