import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { LayoutService } from '../../services/layout.service';
import { BaseComponent } from '../../models/base-component';
import { OfflineBanner } from '../../../shared/components/offline-banner/offline-banner';
import { NotificationToastComponent } from '../../../shared/components/notification-toast/notification-toast.component';
import { ContextMenuComponent } from '../../../shared/components/context-menu/context-menu.component';
import { SyncStatus } from '../../../shared/components/sync-status/sync-status';
import { UploadModalComponent } from '../../../shared/components/modal/upload-modal.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { PromptModalComponent } from '../../../shared/components/modal/prompt-modal.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, OfflineBanner, NotificationToastComponent, ContextMenuComponent, SyncStatus, UploadModalComponent, ConfirmModalComponent, PromptModalComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css'
})
export class AppShellComponent extends BaseComponent {
  public layoutService = inject(LayoutService);
}


