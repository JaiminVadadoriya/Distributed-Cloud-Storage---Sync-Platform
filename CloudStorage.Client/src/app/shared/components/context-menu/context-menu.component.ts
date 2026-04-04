import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  host: {
    '(window:keydown.escape)': 'onEscape()'
  },
  template: `
    @if (layout.isContextMenuOpen()) {
      <div class="fixed inset-0 z-[100]" (mousedown)="layout.closeContextMenu()">
        <div 
          class="fixed bg-editorial-bg border-2 border-editorial-text shadow-[8px_8px_0px_rgba(0,0,0,1)] min-w-[220px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          [style.left.px]="layout.contextMenuPosition().x"
          [style.top.px]="layout.contextMenuPosition().y"
          (click)="$event.stopPropagation()">
          
          <div class="py-2 divide-y divide-editorial-text/10">
            @for (item of layout.contextMenuItems(); track $index) {
              @if (item.separator) {
                <div class="my-2 border-t border-editorial-text/10"></div>
              } @else {
                <button 
                  (click)="handleAction(item)"
                  [disabled]="item.disabled"
                  class="w-full px-4 py-3 flex items-center gap-4 hover:bg-editorial-text hover:text-editorial-bg transition-colors group text-left disabled:opacity-30 disabled:cursor-not-allowed"
                  [class.text-rose-600]="item.danger"
                  [class.hover:bg-rose-600]="item.danger">
                  
                  @if (item.icon) {
                    <span class="w-4 h-4 flex items-center justify-center" [innerHTML]="item.icon"></span>
                  }
                  
                  <span class="text-[10px] font-mono font-bold uppercase tracking-widest flex-1">
                    {{ item.label }}
                  </span>

                  @if (item.shortcut) {
                    <span class="text-[8px] font-mono opacity-40 group-hover:opacity-100">
                      {{ item.shortcut }}
                    </span>
                  }
                </button>
              }
            }
          </div>

          <!-- Technical status bar -->
          <div class="px-4 py-1.5 bg-editorial-text/[0.03] border-t border-editorial-text/10 flex justify-between items-center">
            <span class="text-[7px] font-mono text-editorial-text/30 uppercase tracking-[0.2em]">Context_Proxy: ACTIVE</span>
            <div class="w-1 h-1 bg-editorial-text/20 animate-pulse"></div>
          </div>
        </div>
      </div>
    }
  `
})
export class ContextMenuComponent {
  layout = inject(LayoutService);

  handleAction(item: any) {
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
