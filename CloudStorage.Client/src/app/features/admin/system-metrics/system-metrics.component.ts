import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';

@Component({
  selector: 'app-system-metrics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700 selection:bg-editorial-text selection:text-editorial-bg">
      <header class="pb-12 border-b-2 border-editorial-text flex justify-between items-end">
        <div class="space-y-4">
          <h3 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 italic">Global_Cluster_Observatory</h3>
          <h1 class="text-7xl font-sans font-bold tracking-tighter text-editorial-text uppercase italic leading-none">Telemetry_Node</h1>
          <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/60">Real-time IO throughput & cluster synchronization affinity</p>
        </div>
        <div class="hidden md:block text-right space-y-2">
           <div class="px-4 py-2 border border-editorial-text/20 font-mono text-[10px] inline-block uppercase tracking-widest">Latency: 12ms</div>
           <div class="text-[8px] font-mono opacity-30 uppercase tracking-[0.3em]">Segment: EU-CENTRAL-1</div>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-px bg-editorial-text border border-editorial-text/10">
        @for (stat of stats(); track stat.label) {
          <div class="bg-editorial-bg p-8 space-y-10 group relative overflow-hidden transition-all hover:bg-editorial-text/[0.02]">
            <div class="grain-wrapper">
              <div class="absolute inset-0 opacity-[0.02] grain-overlay"></div>
            </div>
            <div class="relative z-10 space-y-2">
              <h4 class="font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/40 italic">{{ stat.label }}</h4>
              <div class="text-3xl font-sans font-bold tracking-tighter text-editorial-text uppercase">{{ stat.value }}</div>
            </div>
            
            <!-- Real-time pulse -->
            <div class="absolute bottom-0 left-0 h-[2px] w-full bg-editorial-text/5 overflow-hidden">
               <div class="h-full bg-editorial-text" [style.width.%]="stat.trend" [style.opacity]="0.1 + (stat.trend / 200)"></div>
            </div>
            <div class="absolute top-4 right-4 w-1.5 h-1.5 rounded-full" [class.bg-emerald-500]="stat.status === 'ok'" [class.bg-rose-500]="stat.status === 'warn'"></div>
          </div>
        }
      </div>

      <section class="space-y-12">
        <header class="pb-4 border-b border-editorial-text/20">
          <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">IO_Throughput_Spectral_Analysis</h2>
        </header>

        <div class="h-64 border border-editorial-text/10 bg-editorial-text/[0.01] flex items-end justify-between p-8 gap-4 overflow-hidden relative">
           <div class="absolute inset-x-8 top-8 bottom-24 flex flex-col justify-between opacity-[0.05] pointer-events-none">
              @for (i of [1,2,3,4]; track i) {
                <div class="border-t border-editorial-text w-full"></div>
              }
           </div>
           
           @for (bar of spectralData(); track $index) {
             <div class="flex-1 bg-editorial-text transition-all duration-1000" [style.height.%]="bar" [style.opacity]="0.05 + (bar / 150)"></div>
           }
        </div>
      </section>

      <footer class="pt-20 opacity-20 flex justify-between items-center text-[8px] font-mono uppercase tracking-[0.5em] pb-10">
         <span>Kernel: EX-CORE-V21</span>
         <div class="h-[1px] flex-1 bg-editorial-text/10 mx-16"></div>
         <span>Uptime: 104:12:44:09</span>
      </footer>
    </div>
  `
})
export class SystemMetricsComponent extends BaseComponent implements OnInit {
  stats = signal([
    { label: 'CPU_Node_Load', value: '14.2%', trend: 45, status: 'ok' },
    { label: 'IO_Wait_Spectral', value: '0.04ms', trend: 12, status: 'ok' },
    { label: 'Storage_IOPS', value: '42.8k', trend: 88, status: 'warn' },
    { label: 'Cluster_Sync', value: '99.99%', trend: 100, status: 'ok' },
  ]);

  spectralData = signal<number[]>([]);

  ngOnInit() {
    // Generate dummy spectral data
    this.spectralData.set(Array.from({ length: 60 }, () => Math.floor(Math.random() * 80) + 10));
    
    // Simulate real-time updates
    setInterval(() => {
      this.spectralData.set([...this.spectralData().slice(1), Math.floor(Math.random() * 80) + 10]);
    }, 2000);
  }
}
