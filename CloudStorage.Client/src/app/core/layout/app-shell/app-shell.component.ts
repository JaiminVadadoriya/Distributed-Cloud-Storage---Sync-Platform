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

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, OfflineBanner, NotificationToastComponent, ContextMenuComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css'
})
export class AppShellComponent extends BaseComponent {
  public layoutService = inject(LayoutService);
}


