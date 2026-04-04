import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionStatusService } from '../../../core/services/connection-status.service';
import { SyncEngineService } from '../../../core/services/sync-engine.service';

@Component({
  selector: 'app-offline-banner',
  imports: [CommonModule],
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.css',
})
export class OfflineBanner {
  private connectionStatus = inject(ConnectionStatusService);
  private syncEngine = inject(SyncEngineService);

  isOffline = this.connectionStatus.isOffline;
  pendingOpsCount = this.syncEngine.pendingOpsCount;
  hasPendingOps = this.syncEngine.hasPendingOps;
}
