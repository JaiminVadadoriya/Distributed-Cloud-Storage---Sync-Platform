import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  host: {
    '[class.pointer-events-none]': '!layout.isContextMenuOpen()',
    '[class.pointer-events-auto]': 'layout.isContextMenuOpen()',
    'class': 'block fixed inset-0 z-[100]',
    '(window:keydown.escape)': 'onEscape()'
  },
  template: `
    @if (layout.isContextMenuOpen()) {
      <div 
        class="fixed inset-0 z-[100] pointer-events-auto" 
        (mousedown)="layout.closeContextMenu()"
        (keydown.escape)="layout.closeContextMenu()"
        tabindex="-1">
        <div 
          class="fixed bg-editorial-bg border-2 border-editorial-text shadow-brutalist min-w-[240px] overflow-hidden animate-in-scale"
          [style.left.px]="layout.contextMenuPosition().x"
          [style.top.px]="layout.contextMenuPosition().y"
          (mousedown)="$event.stopPropagation()"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
          tabindex="-1">
          
          <div class="py-2 divide-y-2 divide-editorial-text/5">
            @for (item of layout.contextMenuItems(); track $index) {
              @if (item.separator) {
                <div class="h-1 bg-editorial-text/5 my-1"></div>
              } @else {
                <button 
                  (click)="handleAction(item)"
                  [disabled]="item.disabled"
                  attr.data-testid="context-menu-item-{{item.label}}"
                  class="w-full px-5 py-4 flex items-center gap-5 hover:bg-editorial-text hover:text-editorial-bg transition-all group text-left disabled:opacity-30 disabled:cursor-not-allowed relative"
                  [class.text-rose-500]="item.danger"
                  [class.hover:bg-rose-500]="item.danger">
                  
                  @if (item.icon) {
                    <span class="w-5 h-5 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity" [innerHTML]="item.icon"></span>
                  }
                  
                  <span class="text-[11px] font-mono font-extrabold uppercase tracking-widest flex-1">
                    {{ item.label }}
                  </span>

                  @if (item.shortcut) {
                    <div class="flex items-center gap-1 opacity-20 group-hover:opacity-100 font-mono text-[9px] font-bold">
                       <span>[</span>
                       <span>{{ item.shortcut }}</span>
                       <span>]</span>
                    </div>
                  }

                  <!-- Hover selection marker -->
                  <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-current opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              }
            }
          </div>

          <!-- Technical status bar -->
          <div class="px-5 py-2.5 bg-editorial-text/[0.03] border-t-2 border-editorial-text/10 flex justify-between items-center overflow-hidden relative">
            <span class="text-[8px] font-mono font-bold text-editorial-text/30 uppercase tracking-[0.3em] relative z-10">Context_Proxy: READY</span>
            <div class="flex gap-1 relative z-10">
               <div class="w-1 h-1 bg-editorial-text/20 animate-pulse"></div>
               <div class="w-1 h-1 bg-editorial-text/20 animate-pulse delay-75"></div>
            </div>
            
            <!-- Shimmer effect -->
            <div class="absolute inset-0 bg-editorial-text/5 -translate-x-full animate-[loading-bar_3s_infinite_linear]"></div>
          </div>
        </div>
      </div>
    }
  `
})
export class ContextMenuComponent {
  layout = inject(LayoutService);

  handleAction(item: { disabled?: boolean, action?: () => void }) {
    if (item.disabled) return;
    if (item.action) {
      item.action();
    }
    this.layout.closeContextMenu();
  }

  onEscape() {
    this.layout.closeContextMenu();
  }
}
