import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncEngineService } from '../../../core/services/sync-engine.service';
import { ConnectionStatusService } from '../../../core/services/connection-status.service';

@Component({
  selector: 'app-sync-status',
  imports: [CommonModule],
  templateUrl: './sync-status.html',
  styleUrl: './sync-status.css',
})
export class SyncStatus {
  private syncEngine = inject(SyncEngineService);
  private connectionStatus = inject(ConnectionStatusService);

  isSyncing = this.syncEngine.isSyncing;
  isOffline = this.connectionStatus.isOffline;

  get statusText(): string {
    if (this.isOffline()) return 'Offline';
    if (this.isSyncing()) return 'Syncing...';
    return 'Up to date';
  }

  get statusClass(): string {
    if (this.isOffline()) return 'offline';
    if (this.isSyncing()) return 'syncing';
    return 'synced';
  }
}
