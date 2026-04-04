import { Component, OnInit, inject, signal, effect, ChangeDetectionStrategy, OnDestroy, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';
import { SidebarComponent } from '../../core/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../core/layout/topbar/topbar.component';
import { FileService } from '../../core/services/file.service';
import { FolderService, CreateFolderDto } from '../../core/services/folder.service';
import { SignalRService } from '../../core/services/signalr.service';
import { NotificationService } from '../../core/services/notification.service';
import { ActivityService } from '../../core/services/activity.service';
import { ConnectionStatusService } from '../../core/services/connection-status.service';
import { SyncEngineService } from '../../core/services/sync-engine.service';
import { OfflineCacheService } from '../../core/services/offline-cache.service';
import { LayoutService } from '../../core/services/layout.service';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { UploadManagerService } from '../../core/services/upload-manager.service';
import { formatBytes } from '../../core/utils/format.utils';
import { BaseComponent } from '../../core/models/base-component';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FileListComponent, 
    SidebarComponent, 
    TopbarComponent,
    FileUploadComponent
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent extends BaseComponent implements OnInit, OnDestroy {
  uploadManager = inject(UploadManagerService);
  notificationService = inject(NotificationService);

  signalRService = inject(SignalRService);
  fileService = inject(FileService);
  folderService = inject(FolderService);
  connectionStatus = inject(ConnectionStatusService);
  syncEngine = inject(SyncEngineService);
  offlineCache = inject(OfflineCacheService);
  activityService = inject(ActivityService);
  layoutService = inject(LayoutService);
  
  stats = toSignal(this.fileService.getDashboardStats());
  storageBreakdown = toSignal(this.fileService.getStorageBreakdown());
  recentActivity = toSignal(this.activityService.getRecentActivity());


  @ViewChild('fileList') fileList!: FileListComponent;
  focusedId = signal<string | null>(null);
  viewMode = signal<'grid' | 'list'>('grid');
  showConflictDialog = false;
  showSyncPanel = false;

  constructor() {
    super();

    let wasOffline = false;
    effect(() => {
      const online = this.connectionStatus.isOnline();
      if (!online) {
        wasOffline = true;
      } else if (wasOffline) {
        wasOffline = false;
        // Optimization: In Zoneless, we just run the sync after a delay.
        // runOutsideAngular is no longer required.
        setTimeout(() => this.syncEngine.performSync(), 1500);
      }
    });

    effect(() => {
      if (this.syncEngine.hasConflicts()) {
        this.showConflictDialog = true;
      }
    });
  }

  ngOnInit() {
    // Initial sync on load if online
    if (this.connectionStatus.isOnline()) {
      this.syncEngine.performSync();
    }
    
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

  onFilesDropped(): void {
    // Selection handled via template
  }  
  
  onFilesSelected(events: { file: File, valid: boolean }[]) {
    events.filter(e => e.valid).forEach(e => {
      this.uploadManager.addToQueue(e.file);
    });
    
    if (events.some(e => e.valid)) {
      this.layoutService.closeUploadModal();
    }
  }

  onConflictResolved(event: { fileId: string; resolution: 'KeepLocal' | 'KeepServer' }) {
    this.syncEngine.resolveConflict(event.fileId, event.resolution);
    this.syncEngine.refreshPendingOpsCount();
    this.refreshData();
  }

  createNewFolder() {
    this.layoutService.openPrompt({
      title: 'Initialize_Node',
      placeholder: 'NODE_NAME',
      action: (folderName: string) => {
        if (!folderName || !folderName.trim()) return;

        const trimmedName = folderName.trim();
        const nameRegex = /^[a-zA-Z0-9 _-]+$/;
        
        if (trimmedName.length > 50) {
          this.notificationService.error('ERR_VALIDATION: Name exceeds 50 character capacity.');
          return;
        }
        
        if (!nameRegex.test(trimmedName)) {
          this.notificationService.error('ERR_VALIDATION: Name contains illegal characters.');
          return;
        }

        // Check for duplicates in current fileList
        if (this.fileList && this.fileList.folders().some((f: any) => f.name.toLowerCase() === trimmedName.toLowerCase())) {
          this.notificationService.error('ERR_DUPLICATE: An entity with this identity already exists.');
          return;
        }

        const dto: CreateFolderDto = {
          name: trimmedName,
          parentFolderId: null
        };

        this.folderService.createFolder(dto)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.refreshData();
              this.notificationService.success(`GENESIS_SUCCESS: Folder '${trimmedName}' initialized.`);
            },
            error: (err: unknown) => {
              console.error('Failed to create folder:', err);
              this.notificationService.error('ERR_API: Node initialization failed.');
            }
          });
      }
    });
  }

  formatBytes = formatBytes;
}
