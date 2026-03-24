import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../../core/models/base-component';

@Component({
  selector: 'app-version-compare',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <div class="pb-6 border-b border-editorial-text/20">
        <h2 class="text-lg font-mono font-bold uppercase tracking-[0.3em] text-editorial-text">Version_Compare</h2>
        <p class="text-[9px] font-mono uppercase tracking-widest text-editorial-text/50 mt-1">Diff viewer for text-based files</p>
      </div>

      <div class="border border-editorial-text/10 bg-editorial-text/[0.01] p-10 text-center space-y-6">
        <div class="w-16 h-16 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-3xl font-mono">&Delta;</div>
        <div class="space-y-2">
          <h3 class="text-sm font-mono font-bold uppercase tracking-[0.3em] text-editorial-text/60">Coming_Soon</h3>
          <p class="text-[10px] font-mono uppercase tracking-widest text-editorial-text/40">
            Visual diff comparison between file versions will be available in a future release.
          </p>
        </div>
      </div>
    </div>
  `
})
export class VersionCompareComponent extends BaseComponent {}
