import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../../core/services/layout.service';
import { BaseComponent } from '../../../core/models/base-component';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (layoutService.isContextMenuOpen()) {
      <div class="fixed inset-0 z-[200]" (click)="layoutService.closeContextMenu()">
        <div class="absolute bg-editorial-bg border border-editorial-text/30 shadow-lg min-w-[180px] py-1"
             [style.left.px]="layoutService.contextMenuPosition().x"
             [style.top.px]="layoutService.contextMenuPosition().y"
             (click)="$event.stopPropagation()">
          @for (item of layoutService.contextMenuItems(); track item.label) {
            @if (item.separator) {
              <div class="border-t border-editorial-text/10 my-1"></div>
            } @else {
              <button
                (click)="onAction(item)"
                [disabled]="item.disabled"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest transition-colors disabled:opacity-30"
                [class]="item.danger ? 'text-rose-500 hover:bg-rose-500/10' : 'text-editorial-text hover:bg-editorial-text/5'">
                @if (item.icon) {
                  <span class="text-editorial-text/50">{{ item.icon }}</span>
                }
                <span>{{ item.label }}</span>
              </button>
            }
          }
        </div>
      </div>
    }
  `
})
export class ContextMenuComponent extends BaseComponent {
  layoutService = inject(LayoutService);

  onAction(item: any): void {
    item.action();
    this.layoutService.closeContextMenu();
  }
}
