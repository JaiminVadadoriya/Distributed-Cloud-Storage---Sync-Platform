import { Component, inject, OnInit, ViewChild, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';
import { FileUploadComponent, FileUploadEvent } from '../../components/file-upload/file-upload.component';
import { UploadProgressComponent } from '../../components/upload-progress/upload-progress.component';
import { ConflictDialogComponent } from '../../components/conflict-dialog/conflict-dialog.component';
import { UploadManagerService, UploadTask } from '../../services/upload-manager.service';
import { FileService, DashboardStats } from '../../core/file.service';
import { SignalRService } from '../../core/signalr.service';
import { NotificationService } from '../../core/notification.service';
import { ConnectionStatusService } from '../../core/connection-status.service';
import { SyncEngineService, ConflictInfo } from '../../core/sync-engine.service';
import { OfflineCacheService } from '../../core/offline-cache.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FileListComponent, FileUploadComponent, UploadProgressComponent, ConflictDialogComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold">Dashboard</h1>
          <!-- Online/Offline Status Dot -->
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full"
                 [class]="connectionStatus.isOnline() ? 'bg-green-500' : 'bg-amber-500 animate-pulse'"></div>
            <span class="text-xs text-text-muted font-medium">
              {{ connectionStatus.isOnline() ? 'Online' : 'Offline' }}
            </span>
          </div>
          @if (syncEngine.hasPendingOps()) {
            <span class="text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full font-medium">
              {{ syncEngine.pendingOpsCount() }} pending
            </span>
          }
        </div>
        <button (click)="showUploadModal = true" class="bg-primary hover:bg-primary/90 text-primary-content px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-primary/25">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
           <span>Upload <span class="hidden sm:inline">File</span></span>
        </button>
      </div>

      <!-- Quick Stats -->
      @if (stats$ | async; as stats) {
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div class="bg-primary/5 p-6 rounded-2xl border border-primary/10">
            <div class="text-text-muted text-sm font-medium mb-2">Total Storage</div>
            <div class="text-3xl font-bold text-primary">{{ formatBytes(stats.totalStorageBytes) }} <span class="text-lg text-text-muted font-normal">/ {{ formatBytes(stats.maxStorageBytes) }}</span></div>
         </div>
         <div class="bg-secondary/5 p-6 rounded-2xl border border-secondary/10">
            <div class="text-text-muted text-sm font-medium mb-2">Total Files</div>
            <div class="text-3xl font-bold text-secondary">{{ stats.totalFiles }}</div>
         </div>
         <div class="bg-indigo-50 dark:bg-indigo-500/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
            <div class="text-text-muted text-sm font-medium mb-2">Recent Activity</div>
            <div class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{{ stats.recentUploads }}</div>
            <div class="text-xs text-text-muted">Files uploaded this week</div>
         </div>
      </div>
      } @else {
        <!-- Skeleton Loading State -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
           <div class="bg-gray-100 dark:bg-white/5 h-32 rounded-2xl"></div>
           <div class="bg-gray-100 dark:bg-white/5 h-32 rounded-2xl"></div>
           <div class="bg-gray-100 dark:bg-white/5 h-32 rounded-2xl"></div>
        </div>
      }

      <!-- Active Uploads Section -->
      @if (uploadQueue$ | async; as queue) {
        @if (queue.length > 0) {
          <div class="space-y-4">
            <h3 class="font-bold text-lg">Active Uploads</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (task of queue; track task.id) {
                <app-upload-progress 
                  [progress]="task.progress"
                  (uploadPaused)="uploadManager.pauseUpload(task.id)"
                  (uploadResumed)="uploadManager.resumeUpload(task.id)"
                  (uploadCancelled)="uploadManager.cancelUpload(task.id)">
                </app-upload-progress>
              }
            </div>
          </div>
        }
      }

      <!-- File List -->
      <app-file-list #fileList></app-file-list>

      <!-- Upload Modal Overlay -->
      @if (showUploadModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
             (click)="showUploadModal = false" (keydown.escape)="showUploadModal = false" tabindex="0">
           <div class="bg-surface-100 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" 
                (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()" tabindex="0">
              <div class="flex items-center justify-between mb-6">
                 <h2 class="text-xl font-bold">Upload Files</h2>
                 <button (click)="showUploadModal = false" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </div>
              
              <app-file-upload (filesSelected)="onFilesSelected($event)"></app-file-upload>
           </div>
        </div>
      }

      <!-- Conflict Resolution Dialog -->
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
export class DashboardComponent implements OnInit, OnDestroy {
  uploadManager = inject(UploadManagerService);
  fileService = inject(FileService);
  signalRService = inject(SignalRService);
  notificationService = inject(NotificationService);
  connectionStatus = inject(ConnectionStatusService);
  syncEngine = inject(SyncEngineService);
  offlineCache = inject(OfflineCacheService);
  
  uploadQueue$: Observable<UploadTask[]> = this.uploadManager.getUploadQueue();
  stats$: Observable<DashboardStats> = this.fileService.getDashboardStats();
  
  @ViewChild('fileList') fileList!: FileListComponent;
  
  showUploadModal = false;
  showConflictDialog = false;
  private queueSub?: Subscription;
  private signalRSubs: Subscription[] = [];

  constructor() {
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
    // Monitor upload queue to refresh file list when an upload completes
    this.queueSub = this.uploadQueue$.subscribe(tasks => {
      const hasJustCompleted = tasks.some(t => t.progress.status === 'complete');
      if (hasJustCompleted && this.fileList) {
        this.refreshData();
        this.uploadManager.clearCompletedTasks();
      }
    });

    // Start Real-Time Connection
    this.signalRService.startConnection();

    // Listen to real-time events
    this.signalRSubs.push(
      this.signalRService.fileUploaded$.subscribe(event => {
        this.notificationService.success(`File uploaded: ${event.fileName}`);
        this.refreshData();
      }),
      this.signalRService.fileDeleted$.subscribe(event => {
        this.notificationService.info(`File deleted.`);
        this.refreshData();
      }),
      this.signalRService.allFilesDeleted$.subscribe(event => {
        this.notificationService.warning(`All files deleted.`);
        this.refreshData();
      })
    );

    // Cache files on initial load and perform initial sync check
    this.syncEngine.refreshPendingOpsCount();
  }

  ngOnDestroy() {
    this.queueSub?.unsubscribe();
    this.signalRSubs.forEach(s => s.unsubscribe());
    this.signalRService.stopConnection();
  }

  private refreshData() {
    if (this.fileList) {
      this.fileList.loadFiles();
    }
    this.stats$ = this.fileService.getDashboardStats();
  }

  onFilesSelected(events: FileUploadEvent[]) {
    events.filter(e => e.valid).forEach(e => {
      this.uploadManager.addToQueue(e.file);
    });
    
    if (events.some(e => e.valid)) {
      this.showUploadModal = false;
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
