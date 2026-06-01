import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.viewBox]="viewBox()" class="w-full h-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient [id]="gradId" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.2" />
          <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0" />
        </linearGradient>
      </defs>
      
      <!-- Area filling -->
      <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradId + ')'" />
      
      <!-- Line -->
      <path [attr.d]="linePath()" fill="none" [attr.stroke]="color()" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      
      <!-- Last Point Highlight -->
      @if (showLastPoint() && points().length > 0) {
        <circle [attr.cx]="points().slice(-1)[0].x" [attr.cy]="points().slice(-1)[0].y" r="3" [attr.fill]="color()" class="animate-pulse" />
      }
    </svg>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
  `]
})
export class SparklineComponent {
  data = input<number[]>([]);
  color = input<string>('currentColor');
  showLastPoint = input<boolean>(true);
  width = input<number>(100);
  height = input<number>(30);

  // Stable ID for the gradient during component lifecycle
  protected readonly gradId = `spark-grad-${Math.random().toString(36).substring(2, 9)}`;

  protected readonly viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  protected readonly points = computed(() => {
    const dataList = this.data();
    if (!dataList || dataList.length < 2) return [];
    
    const min = Math.min(...dataList);
    const max = Math.max(...dataList);
    const range = max - min || 1;
    
    const dx = this.width() / (dataList.length - 1);
    
    return dataList.map((val, i) => ({
      x: i * dx,
      y: this.height() - ((val - min) / range) * this.height()
    }));
  });

  protected readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    return `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`;
  });

  protected readonly areaPath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    const last = pts[pts.length - 1];
    return `${this.linePath()} L ${last.x},${this.height()} L 0,${this.height()} Z`;
  });
}
