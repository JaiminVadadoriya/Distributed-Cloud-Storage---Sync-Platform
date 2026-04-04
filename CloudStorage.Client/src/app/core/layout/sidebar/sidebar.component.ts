import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { FileService } from '../../services/file.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { BaseComponent } from '../../models/base-component';
import { formatBytes } from '../../utils/format.utils';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent extends BaseComponent {
  public layoutService = inject(LayoutService);
  private fileService = inject(FileService);
  public stats = toSignal(this.fileService.getDashboardStats());

  public closeSidebar(): void {
    this.layoutService.closeSidebar();
  }

  /** Delegates to shared utility */
  public formatBytes = formatBytes;

  public getPercentage(used: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  }
}
