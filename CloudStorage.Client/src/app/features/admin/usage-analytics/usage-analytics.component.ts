import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-usage-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 selection:bg-editorial-text selection:text-editorial-bg">
      <header class="pb-12 border-b-2 border-editorial-text flex justify-between items-end">
        <div class="space-y-4">
          <h3 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 italic">Global_Usage_Analytics</h3>
          <h1 class="text-7xl font-sans font-bold tracking-tighter text-editorial-text uppercase italic leading-none">Activity_Spectral</h1>
          <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/60">Cross-segment user behavior and storage lifecycle telemetry</p>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        @for (stat of overviewStats(); track stat.label) {
          <div class="p-8 border border-editorial-text/10 bg-editorial-text/[0.01] space-y-4 group hover:border-editorial-text/40 transition-all">
             <div class="flex justify-between items-start">
                <span class="font-mono text-[9px] uppercase tracking-[0.3em] opacity-40 italic">{{ stat.label }}</span>
                <span class="text-emerald-500 text-[8px] font-mono font-bold">+{{ stat.trend }}%</span>
             </div>
             <div class="text-4xl font-sans font-bold tracking-tighter text-editorial-text uppercase leading-none">{{ stat.value }}</div>
          </div>
        }
      </div>

      <section class="space-y-12">
        <header class="pb-4 border-b border-editorial-text/20">
          <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">Storage_Inertia_Analysis</h2>
        </header>

        <div class="relative h-48 border border-editorial-text/10 bg-editorial-text/[0.01] p-10 flex gap-4 items-end justify-between overflow-hidden">
           <div class="grain-wrapper">
             <div class="absolute inset-0 opacity-[0.02] grain-overlay select-none"></div>
           </div>
           @for (i of [1,2,3,4,5,6,7,8,9,10,11,12]; track i) {
             <div class="flex-1 bg-editorial-text/10 transition-all duration-700 group hover:bg-editorial-text relative pt-12" [style.height.%]="i * 8">
                <div class="absolute -top-12 left-0 w-full text-center font-mono text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Node_{{ i }}</div>
             </div>
           }
        </div>
        <p class="font-mono text-[10px] uppercase tracking-widest text-editorial-text/40 text-center leading-loose">
          Predictive model: High_Affinity_Growth | Regression: Linear_Positive
        </p>
      </section>

      <div class="p-16 border-2 border-editorial-text border-dashed bg-editorial-text/[0.02] flex flex-col items-center text-center space-y-10 group">
         <div class="w-16 h-16 border border-editorial-text/10 flex items-center justify-center text-editorial-text/20 text-3xl font-mono grayscale group-hover:grayscale-0 transition-all select-none">&#128200;</div>
         <div class="space-y-4 max-w-xl mx-auto">
            <h4 class="text-xl font-sans font-bold uppercase tracking-tight text-editorial-text">Enterprise_Intelligence_Suite</h4>
            <p class="font-mono text-xs uppercase tracking-widest text-editorial-text/50 leading-relaxed italic px-8">
              Deep behavior spectral analysis and automated storage lifecycle forecasting remains locked for the current Tier. Contact global admin for Node_Escalation.
            </p>
            <button class="px-12 py-5 bg-editorial-text text-editorial-bg font-mono text-[10px] font-bold uppercase tracking-[0.3em] hover:opacity-90 active:scale-[0.98] transition-all">
              Request_Observation_Binding
            </button>
         </div>
      </div>

      <footer class="opacity-20 flex justify-between items-center text-[8px] font-mono uppercase tracking-[0.5em] pt-12 pb-10">
         <span>Audit: PASS</span>
         <div class="h-[1px] flex-1 bg-editorial-text/10 mx-16"></div>
         <span>Telemetry: Captured_V3</span>
      </footer>
    </div>
  `
})
export class UsageAnalyticsComponent {
  overviewStats = signal([
    { label: 'Active_Nodes', value: '4,102', trend: 12 },
    { label: 'Avg_Storage_IO', value: '42.8 GB', trend: 6 },
    { label: 'Network_Affinity', value: '0.84', trend: 22 },
    { label: 'Segment_Entropy', value: 'Low', trend: 0 },
  ]);
}
