import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionStatusService } from '../../../core/services/connection-status.service';

@Component({
  selector: 'app-offline-banner',
  imports: [CommonModule],
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.css',
})
export class OfflineBanner {
  private connectionStatus = inject(ConnectionStatusService);
  isOffline = this.connectionStatus.isOffline;
}
