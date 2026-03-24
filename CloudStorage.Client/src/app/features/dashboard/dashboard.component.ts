import { Component, inject, OnInit, ViewChild, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { UploadProgressComponent } from '../../shared/components/upload-progress/upload-progress.component';
import { ConflictDialogComponent } from '../../shared/components/conflict-dialog/conflict-dialog.component';
import { SyncTestPanelComponent } from '../../shared/components/sync-test-panel/sync-test-panel.component';
import { UploadManagerService } from '../../core/services/upload-manager.service';
import { FileService } from '../../core/services/file.service';
import { SignalRService } from '../../core/services/signalr.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConnectionStatusService } from '../../core/services/connection-status.service';
import { SyncEngineService } from '../../core/services/sync-engine.service';
import { OfflineCacheService } from '../../core/services/offline-cache.service';
import { LayoutService } from '../../core/services/layout.service';
import { BaseComponent } from '../../core/models/base-component';
import { DashboardStats } from '../../core/models/file.model';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FileListComponent, FileUploadComponent, UploadProgressComponent, ConflictDialogComponent, SyncTestPanelComponent],
  template: `
    <div class="space-y-12">
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-editorial-text/20">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">Overview</h1>
            <span class="text-[10px] font-mono text-editorial-text/60 tracking-[0.3em] uppercase mt-2">v.21.0.4-LTS</span>
          </div>
          
          <div class="flex items-center gap-6 font-mono text-[9px] uppercase tracking-widest">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-none" [class]="connectionStatus.isOnline() ? 'bg-editorial-text' : 'bg-rose-500 animate-pulse'"></span>
              <span class="text-editorial-text/60">Status:</span>
              <span class="text-editorial-text font-bold">{{ connectionStatus.isOnline() ? 'LINK_ACTIVE' : 'LINK_INTERRUPTED' }}</span>
            </div>

            @if (syncEngine.hasPendingOps()) {
              <div class="flex items-center gap-2 text-editorial-text/70">
                <span class="text-editorial-text/60">Queue:</span>
                <span class="text-editorial-text font-bold">{{ syncEngine.pendingOpsCount() }}_PENDING_OPS</span>
              </div>
            }
          </div>
        </div>

        <div class="flex items-center gap-4">
          <button (click)="showSyncPanel = !showSyncPanel"
                  class="px-5 py-3 border border-editorial-text/20 text-[9px] font-mono uppercase tracking-widest transition-all hover:bg-editorial-text/5 active:scale-[0.98]"
                  [class.bg-editorial-text]="showSyncPanel"
                  [class.text-editorial-bg]="showSyncPanel">
            Diagnostic: Sync
          </button>
          
          <button (click)="layoutService.openUploadModal()" class="px-6 py-3 bg-editorial-text text-editorial-bg font-mono text-[9px] uppercase tracking-[0.2em] font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y2="15"/></svg>
            Initialize_Upload
          </button>
        </div>
      </div>

      <!-- Quick Stats (Technical Bento) -->
      @if (stats(); as stats) {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-0 border border-editorial-text/20 bg-editorial-text/[0.01]">
           <div class="p-10 border-b md:border-b-0 md:border-r border-editorial-text/20 space-y-8">
              <span class="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-editorial-text/70">01_Storage_Metric</span>
              <div class="space-y-1">
                <div class="text-3xl font-bold font-mono text-editorial-text tracking-tight">{{ formatBytes(stats.totalStorageBytes) }}</div>
                <div class="text-[10px] font-mono text-editorial-text/60 uppercase tracking-widest underline decoration-editorial-text/20 underline-offset-4">OF {{ formatBytes(stats.maxStorageBytes) }} CAP</div>
              </div>
           </div>
           
           <div class="p-10 border-b md:border-b-0 md:border-r border-editorial-text/20 space-y-8">
              <span class="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-editorial-text/70">02_Identity_Objects</span>
              <div class="space-y-1">
                <div class="text-3xl font-bold font-mono text-editorial-text tracking-tight">{{ stats.totalFiles }}</div>
                <div class="text-[10px] font-mono text-editorial-text/60 uppercase tracking-widest border-b border-editorial-text/20 inline-block pb-1">Verified File Entities</div>
              </div>
           </div>
  
           <div class="p-10 space-y-8">
              <span class="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-editorial-text/70">03_Recent_Sequence</span>
              <div class="space-y-1">
                <div class="text-3xl font-bold font-mono text-editorial-text tracking-tight">+{{ stats.recentUploads }}</div>
                <div class="text-[10px] font-mono text-editorial-text/60 uppercase tracking-widest italic">Cycle 7: Activity Log</div>
              </div>
           </div>
        </div>
      } @else {
        <!-- Skeleton Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-0 border border-editorial-text/10 bg-editorial-text/[0.01] animate-pulse">
           <div class="p-10 border-b md:border-b-0 md:border-r border-editorial-text/5 space-y-8">
              <span class="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-editorial-text/10">01_Storage_Metric</span>
              <div class="space-y-1">
                <div class="text-3xl font-bold font-mono text-editorial-text/10 tracking-tight">--- GB</div>
                <div class="text-[10px] font-mono text-editorial-text/5 uppercase tracking-widest">CALCULATING_CAPACITY</div>
              </div>
           </div>
           
           <div class="p-10 border-b md:border-b-0 md:border-r border-editorial-text/5 space-y-8">
              <span class="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-editorial-text/10">02_Identity_Objects</span>
              <div class="space-y-1">
                <div class="text-3xl font-bold font-mono text-editorial-text/10 tracking-tight">[ _ ]</div>
                <div class="text-[10px] font-mono text-editorial-text/5 uppercase tracking-widest">LOCATING_ENTITIES</div>
              </div>
           </div>
  
           <div class="p-10 space-y-8">
              <span class="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-editorial-text/10">03_Recent_Sequence</span>
              <div class="space-y-1">
                <div class="text-3xl font-bold font-mono text-editorial-text/10 tracking-tight">[ _ ]</div>
                <div class="text-[10px] font-mono text-editorial-text/5 uppercase tracking-widest">FETCHING_LOGS</div>
              </div>
           </div>
        </div>
      }

      <!-- Performance / Upload Section -->
      @if (uploadManager.queue(); as queue) {
        @if (queue.length > 0) {
          <div class="py-6 border-y border-editorial-text/5">
            <h3 class="text-[11px] font-mono font-bold uppercase tracking-[0.4em] text-editorial-text mb-8">Active_Transmissions</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
              @for (task of queue; track task.id) {
                <app-upload-progress 
                  [progress]="task"
                  (uploadCancelled)="uploadManager.clearCompleted()">
                </app-upload-progress>
              }
            </div>
          </div>
        }
      }

      <!-- Content Layer -->
      <div class="pt-8">
        <app-file-list #fileList></app-file-list>
      </div>

      <!-- Extended Diagnostics -->
      @if (showSyncPanel) {
        <div class="p-10 border border-editorial-text/20 bg-editorial-text/[0.02]">
          <h3 class="text-[10px] font-mono font-bold uppercase tracking-widest mb-6 text-editorial-text/70">Diagnostic Subsystem</h3>
          <app-sync-test-panel></app-sync-test-panel>
        </div>
      }

      <!-- Command Modal: Upload -->
      @if (layoutService.isUploadModalOpen()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-editorial-text/10" 
             (click)="layoutService.closeUploadModal()" (keydown.escape)="layoutService.closeUploadModal()" tabindex="0">
           <div class="bg-editorial-bg border-2 border-editorial-text p-12 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative z-10 rounded-none" 
                (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()" tabindex="0">
              <div class="flex items-start justify-between mb-12">
                 <div>
                   <h2 class="text-3xl font-bold font-sans tracking-tighter uppercase text-editorial-text">Data_Injection</h2>
                   <p class="text-[9px] font-mono uppercase tracking-[0.2em] text-editorial-text/70 mt-2">Select files for encrypted synchronization.</p>
                 </div>
                 <button (click)="layoutService.closeUploadModal()" class="p-4 border border-editorial-text/20 hover:bg-editorial-text hover:text-editorial-bg transition-none rounded-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </div>
              
              <app-file-upload (filesSelected)="onFilesSelected($event)"></app-file-upload>
           </div>
        </div>
      }

      <!-- Command Modal: Conflict -->
      @if (showConflictDialog && syncEngine.hasConflicts()) {
        <app-conflict-dialog
          [conflicts]="syncEngine.conflicts()"
          (closed)="showConflictDialog = false"
          (resolved)="onConflictResolved($event)">
        </app-conflict-dialog>
      }
    </div>
  `
})
export class DashboardComponent extends BaseComponent implements OnInit {
  uploadManager = inject(UploadManagerService);
  fileService = inject(FileService);
  signalRService = inject(SignalRService);
  notificationService = inject(NotificationService);
  connectionStatus = inject(ConnectionStatusService);
  syncEngine = inject(SyncEngineService);
  offlineCache = inject(OfflineCacheService);
  layoutService = inject(LayoutService);
  
  // Use the service signal directly where possible
  stats = toSignal(this.fileService.getDashboardStats());
  
  @ViewChild('fileList') fileList!: FileListComponent;
  
  showConflictDialog = false;
  showSyncPanel = false;

  constructor() {
    super();
    // Watch for conflicts and auto-open dialog
    effect(() => {
      if (this.syncEngine.hasConflicts()) {
        this.showConflictDialog = true;
      }
    });

    // Watch for coming back online — trigger sync only on reconnection
    let wasOffline = false;
    effect(() => {
      const online = this.connectionStatus.isOnline();
      if (!online) {
        wasOffline = true;
      } else if (wasOffline) {
        wasOffline = false;
        // Small delay to let network stabilize
        setTimeout(() => this.syncEngine.performSync(), 1500);
      }
    });
  }

  ngOnInit() {
    this.refreshData();

    // Start Real-Time Connection
    this.signalRService.startConnection();

    // Listen to real-time events with auto-cleanup
    this.signalRService.fileUploaded$.pipe(takeUntil(this.destroy$)).subscribe(event => {
      this.notificationService.success(`File uploaded: ${event.fileName}`);
      this.refreshData();
    });

    this.signalRService.fileDeleted$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.notificationService.info(`File deleted.`);
      this.refreshData();
    });

    this.signalRService.allFilesDeleted$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.notificationService.warning(`All files deleted.`);
      this.refreshData();
    });

    // Perform initial sync check
    this.syncEngine.refreshPendingOpsCount();
  }

  // override ngOnDestroy to stop connection
  override ngOnDestroy() {
    super.ngOnDestroy();
    this.signalRService.stopConnection();
  }

  private refreshData() {
    if (this.fileList) {
      this.fileList.loadFiles();
    }
    // With Signals, we don't need to manually re-assign the observable.
    // However, if getDashboardStats() returns a NEW observable each time, 
    // we might need a refresh trigger if the service doesn't use a Subject/BehaviorSubject.
    // Assuming fileService.getDashboardStats() is reactive.
  }

  onFilesSelected(events: any[]) {
    events.filter(e => e.valid).forEach(e => {
      this.uploadManager.addToQueue(e.file);
    });
    
    if (events.some(e => e.valid)) {
      this.layoutService.closeUploadModal();
    }
  }

  onConflictResolved(event: { fileId: string; resolution: 'KeepLocal' | 'KeepServer' }) {
    // Refresh file list after a conflict is resolved
    this.refreshData();
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
