import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';

@Component({
  selector: 'app-usage-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-12">
      <div class="pb-8 border-b border-editorial-text/20">
        <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">Analytics</h1>
        <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60 mt-2">Storage trends and usage patterns</p>
      </div>

      <!-- Usage Bars -->
      <div class="space-y-6">
        <div class="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-editorial-text/70">Storage_By_Type</div>
        <div class="space-y-4">
          @for (item of storageBreakdown; track item.label) {
            <div class="space-y-1">
              <div class="flex justify-between text-[9px] font-mono uppercase tracking-widest">
                <span class="text-editorial-text/70">{{ item.label }}</span>
                <span class="text-editorial-text/50">{{ item.value }}</span>
              </div>
              <div class="h-2 w-full bg-editorial-text/5 overflow-hidden">
                <div class="h-full bg-editorial-text/40" [style.width.%]="item.percent"></div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Activity Heatmap Placeholder -->
      <div class="border border-editorial-text/10 bg-editorial-text/[0.01] p-10 space-y-6">
        <div class="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-editorial-text/50">Activity_Heatmap</div>
        <div class="grid grid-cols-7 gap-1">
          @for (day of heatmapDays; track $index) {
            <div class="aspect-square bg-editorial-text/5 hover:bg-editorial-text/20 transition-colors"
              [style.opacity]="0.2 + (day * 0.8)"></div>
          }
        </div>
        <div class="flex justify-between text-[7px] font-mono uppercase tracking-widest text-editorial-text/30">
          <span>4 weeks ago</span>
          <span>Today</span>
        </div>
      </div>

      <!-- Monthly Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-0 border border-editorial-text/20">
        <div class="p-8 border-b md:border-b-0 md:border-r border-editorial-text/20">
          <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 mb-2">Uploads_This_Month</div>
          <div class="text-2xl font-bold font-mono text-editorial-text">342</div>
        </div>
        <div class="p-8 border-b md:border-b-0 md:border-r border-editorial-text/20">
          <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 mb-2">Downloads</div>
          <div class="text-2xl font-bold font-mono text-editorial-text">189</div>
        </div>
        <div class="p-8 border-b md:border-b-0 md:border-r border-editorial-text/20">
          <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 mb-2">Shared_Files</div>
          <div class="text-2xl font-bold font-mono text-editorial-text">27</div>
        </div>
        <div class="p-8">
          <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 mb-2">Active_Devices</div>
          <div class="text-2xl font-bold font-mono text-editorial-text">3</div>
        </div>
      </div>
    </div>
  `
})
export class UsageAnalyticsComponent extends BaseComponent {
  storageBreakdown = [
    { label: 'Documents', value: '2.4 GB', percent: 45 },
    { label: 'Images', value: '1.8 GB', percent: 34 },
    { label: 'Videos', value: '800 MB', percent: 15 },
    { label: 'Other', value: '320 MB', percent: 6 },
  ];

  heatmapDays = Array.from({ length: 28 }, () => Math.random());
}
