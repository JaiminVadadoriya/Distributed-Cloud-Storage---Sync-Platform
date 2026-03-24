import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-pulse space-y-3">
      @switch (variant()) {
        @case ('table') {
          @for (row of rows; track $index) {
            <div class="flex gap-4 items-center py-3 border-b border-editorial-text/5">
              <div class="w-4 h-4 bg-editorial-text/10 rounded-none"></div>
              <div class="flex-1 h-3 bg-editorial-text/10 rounded-none"></div>
              <div class="w-20 h-3 bg-editorial-text/8 rounded-none"></div>
              <div class="w-16 h-3 bg-editorial-text/6 rounded-none"></div>
            </div>
          }
        }
        @case ('card') {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            @for (card of rows; track $index) {
              <div class="border border-editorial-text/10 p-6 space-y-3">
                <div class="w-full h-20 bg-editorial-text/8 rounded-none"></div>
                <div class="w-3/4 h-3 bg-editorial-text/10 rounded-none"></div>
                <div class="w-1/2 h-2 bg-editorial-text/6 rounded-none"></div>
              </div>
            }
          </div>
        }
        @case ('text') {
          @for (line of rows; track $index) {
            <div class="h-3 bg-editorial-text/10 rounded-none" [style.width.%]="60 + ($index * 10) % 40"></div>
          }
        }
        @default {
          @for (line of rows; track $index) {
            <div class="h-4 bg-editorial-text/10 rounded-none"></div>
          }
        }
      }
    </div>
  `
})
export class SkeletonLoaderComponent {
  variant = input<'table' | 'card' | 'text' | 'default'>('default');
  count = input<number>(5);

  get rows(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
