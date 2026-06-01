import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { SyncEngineService } from '../../../core/services/sync-engine.service';

/**
 * SyncHistory displays a temporal log of all synchronization 
 * events and entropy resolution actions.
 */
@Component({
  selector: 'app-sync-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-history.html',
  styleUrl: './sync-history.css',
})
export class SyncHistory extends BaseComponent {
  private syncEngine = inject(SyncEngineService);
  
  public syncLog = this.syncEngine.syncLog;

  public clearLog(): void {
    this.syncEngine.clearLog();
  }
}
