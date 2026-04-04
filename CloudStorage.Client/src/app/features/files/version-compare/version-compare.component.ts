import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-version-compare',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 selection:bg-editorial-text selection:text-editorial-bg">
      <header class="pb-8 border-b-2 border-editorial-text flex justify-between items-end">
        <div class="space-y-2">
          <h1 class="text-4xl font-bold font-sans tracking-tight text-editorial-text uppercase italic">Delta_Comparator</h1>
          <p class="text-[10px] font-mono uppercase tracking-[0.4em] text-editorial-text/40">Analyzing Structural Variance: Segment_V2 vs Segment_V3</p>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-editorial-text border border-editorial-text/10">
        <!-- Version A -->
        <div class="bg-editorial-bg p-8 md:p-12 space-y-10">
          <div class="flex justify-between items-center border-b border-editorial-text/10 pb-4">
             <span class="font-mono text-[10px] uppercase font-bold tracking-widest text-editorial-text/40">Sequence_A: Origin</span>
             <span class="px-2 py-0.5 border border-editorial-text/20 font-mono text-[9px] uppercase tracking-widest">v1.2.400</span>
          </div>
          
          <div class="space-y-4">
             @for (i of [1,2,3,4,5]; track i) {
               <div class="h-6 w-full bg-editorial-text/[0.03] border-l-2 border-editorial-text/10 flex items-center px-4">
                  <div class="h-2 w-full bg-editorial-text/10 rounded-none"></div>
               </div>
             }
          </div>
        </div>

        <!-- Version B -->
        <div class="bg-editorial-bg p-8 md:p-12 space-y-10 border-l border-editorial-text/10">
          <div class="flex justify-between items-center border-b border-editorial-text/10 pb-4">
             <span class="font-mono text-[10px] uppercase font-bold tracking-widest text-editorial-text/40">Sequence_B: Current</span>
             <span class="px-2 py-0.5 bg-editorial-text text-editorial-bg font-mono text-[9px] uppercase tracking-widest font-bold">v1.2.404</span>
          </div>
          
          <div class="space-y-4">
             @for (i of [1,2,3,4,5]; track i) {
               <div class="h-6 w-full bg-editorial-text/[0.03] border-l-2 border-editorial-text flex items-center px-4 relative overflow-hidden">
                  <div class="h-2 w-3/4 bg-editorial-text/20 rounded-none"></div>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border border-editorial-text/10 flex items-center justify-center text-[8px] font-mono">+</div>
               </div>
             }
          </div>
        </div>
      </div>

      <div class="p-10 border border-dashed border-editorial-text/20 text-center space-y-6">
         <div class="w-12 h-12 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-xl font-mono">D</div>
         <div class="space-y-2">
            <h4 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40">Simulation_Active</h4>
            <p class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/30">
               Delta comparison requires Enterprise Tier binding.
            </p>
         </div>
      </div>
    </div>
  `
})
export class VersionCompareComponent {
  // Logic to follow in future PRs
}
