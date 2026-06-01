import { Component, OnInit, inject, signal, effect, ChangeDetectionStrategy, OnDestroy, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';
import { FileService } from '../../core/services/file.service';
import { FolderService } from '../../core/services/folder.service';
import { SignalRService } from '../../core/services/signalr.service';
import { NotificationService } from '../../core/services/notification.service';
import { ActivityService } from '../../core/services/activity.service';
import { ConnectionStatusService } from '../../core/services/connection-status.service';
import { SyncEngineService } from '../../core/services/sync-engine.service';
import { OfflineCacheService } from '../../core/services/offline-cache.service';
import { LayoutService } from '../../core/services/layout.service';
import { UploadManagerService } from '../../core/services/upload-manager.service';
import { formatBytes } from '../../core/utils/format.utils';
import { BaseComponent } from '../../core/models/base-component';
import { SearchService } from '../../core/services/search.service';
import { SearchFilter } from '../../core/models/file.model';
import { BehaviorSubject, switchMap, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FileListComponent
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.block]': 'true',
    '[class.h-full]': 'true',
    '[class.w-full]': 'true'
  },
  styles: [`
    :host { display: block; height: 100%; }
  `]
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
  
  private readonly refreshTrigger$ = new BehaviorSubject<void>(undefined);

  stats = toSignal(this.refreshTrigger$.pipe(
    switchMap(() => this.fileService.getDashboardStats())
  ));
  storageBreakdown = toSignal(this.refreshTrigger$.pipe(
    switchMap(() => this.fileService.getStorageBreakdown())
  ));
  recentActivity = toSignal(this.refreshTrigger$.pipe(
    switchMap(() => this.activityService.getRecentActivity())
  ));


  @ViewChild('fileList') fileList!: FileListComponent;
  focusedId = signal<string | null>(null);
  viewMode = signal<'grid' | 'list'>('grid');
  showConflictDialog = signal<boolean>(false);
  showSyncPanel = false;

  public readonly searchService = inject(SearchService);
  public currentCategory = signal<string | null>(null);

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
        this.showConflictDialog.set(true);
      }
    });
  }

  ngOnInit() {
    // Initial sync on load if online
    if (this.connectionStatus.isOnline()) {
      this.syncEngine.performSync();
    }

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

  override ngOnDestroy() {
    super.ngOnDestroy();
  }

  private refreshData() {
    if (this.fileList) {
      this.fileList.loadFiles();
    }
    this.refreshTrigger$.next();
  }

  onFilesDropped(): void {
    // Selection handled via template
  }  

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchService.updateQuery(input.value);
  }

  toggleFilter(category: string): void {
    if (this.currentCategory() === category) {
      this.currentCategory.set(null);
      this.searchService.clearFilters();
    } else {
      this.currentCategory.set(category);
      this.searchService.updateFilters({ fileType: category as SearchFilter['fileType'] });
    }
  }
  

  onConflictResolved(event: { fileId: string; resolution: 'KeepLocal' | 'KeepServer' }) {
    this.syncEngine.resolveConflict(event.fileId, event.resolution);
    this.syncEngine.refreshPendingOpsCount();
    this.refreshData();
  }

  createNewFolder() {
    if (this.fileList) {
      this.fileList.createNewFolder();
    }
  }

  formatBytes = formatBytes;
}
