import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { SyncEngineService } from '../../../core/services/sync-engine.service';
import { formatBytes } from '../../../core/utils/format.utils';

@Component({
  selector: 'app-conflict-center',
  imports: [CommonModule],
  templateUrl: './conflict-center.html',
  styleUrl: './conflict-center.css',
})
export class ConflictCenter extends BaseComponent {
  private syncEngine = inject(SyncEngineService);

  conflicts = this.syncEngine.conflicts;
  isSyncing = this.syncEngine.isSyncing;
  hasConflicts = this.syncEngine.hasConflicts;

  resolve(fileId: string, resolution: 'KeepLocal' | 'KeepServer') {
    this.syncEngine.resolveConflict(fileId, resolution);
  }

  resolveAll(resolution: 'KeepLocal' | 'KeepServer') {
    const list = [...this.conflicts()];
    list.forEach(c => this.resolve(c.fileId, resolution));
  }

  formatSize = formatBytes;
}
