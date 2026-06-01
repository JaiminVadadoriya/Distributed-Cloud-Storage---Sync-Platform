import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (i of countArray(); track $index) {
      <div [class]="classes() + ' mb-2 last:mb-0'" [style.height.px]="height()" [style.width]="width()">
        <div class="absolute inset-0 bg-editorial-text/5 animate-pulse"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-editorial-text/[0.03] to-transparent animate-[shimmer_2s_infinite]"></div>
        
        <!-- Editorial Accents -->
        <div class="absolute top-0 left-0 w-1 h-1 bg-editorial-text/10"></div>
        <div class="absolute bottom-0 right-0 w-1 h-1 bg-editorial-text/10"></div>
      </div>
    }
  `,
  styles: [`
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `]
})
export class SkeletonLoaderComponent {
  height = input<number>(20);
  width = input<string>('100%');
  variant = input<'text' | 'rect' | 'circle' | 'table'>('text');
  count = input<number>(1);

  countArray() {
    return Array(this.count() || 1);
  }

  classes() {
    const base = 'relative overflow-hidden bg-editorial-text/[0.02] border border-editorial-text/5 ';
    if (this.variant() === 'circle') return base + 'rounded-full';
    return base + 'rounded-none';
  }
}
