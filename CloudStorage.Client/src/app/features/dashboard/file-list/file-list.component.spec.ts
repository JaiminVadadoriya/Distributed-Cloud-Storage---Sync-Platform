import '../../../../test-setup';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { signal, NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { FileListComponent } from './file-list.component';
import { FileService } from '../../../core/services/file.service';
import { FolderService } from '../../../core/services/folder.service';
import { ConnectionStatusService } from '../../../core/services/connection-status.service';
import { OfflineCacheService } from '../../../core/services/offline-cache.service';
import { SyncEngineService } from '../../../core/services/sync-engine.service';
import { SearchService } from '../../../core/services/search.service';
import { LayoutService } from '../../../core/services/layout.service';
import { UploadManagerService } from '../../../core/services/upload-manager.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { FileItem } from '../../../core/models/file.model';

describe('FileListComponent', () => {
  let component: FileListComponent;
  let fixture: ComponentFixture<FileListComponent>;
  let mockFileService: FileService;
  let mockFolderService: FolderService;
  let mockConnectionStatus: ConnectionStatusService;
  let mockOfflineCache: OfflineCacheService;
  let mockSyncEngine: SyncEngineService;
  let mockSearchService: SearchService;
  let mockLayoutService: LayoutService;
  let mockUploadManager: UploadManagerService;
  let mockNotification: NotificationService;
  let mockRouter: Router;

  beforeEach(async () => {
    mockFileService = {
      getFiles: vi.fn().mockReturnValue(of([])),
      deleteFile: vi.fn().mockReturnValue(of(undefined)),
      renameFile: vi.fn().mockReturnValue(of(undefined)),
      isLoading: signal(false)
    } as unknown as FileService;

    mockFolderService = {
      getRootFolders: vi.fn().mockReturnValue(of([])),
      createFolder: vi.fn().mockReturnValue(of({}))
    } as unknown as FolderService;

    mockConnectionStatus = {
      isOnline: signal(true),
      isOffline: signal(false)
    } as unknown as ConnectionStatusService;

    mockOfflineCache = {
      getCachedFiles: vi.fn().mockResolvedValue([]),
      cacheFiles: vi.fn().mockResolvedValue(undefined)
    } as unknown as OfflineCacheService;

    mockSyncEngine = {
      hasPendingOps: signal(false)
    } as unknown as SyncEngineService;

    mockSearchService = {
      query: signal(''),
      filters: signal({}),
      suggestions: signal([]),
      hasActiveFilters: signal(false),
      updateQuery: vi.fn(),
      updateFilters: vi.fn(),
      clearFilters: vi.fn(),
      addToHistory: vi.fn()
    } as unknown as SearchService;

    mockLayoutService = {
      isContextMenuOpen: signal(false),
      openContextMenu: vi.fn(),
      closeContextMenu: vi.fn(),
      openPrompt: vi.fn(),
      uploadTrigger$: new Subject<void>(),
      newFolderTrigger$: new Subject<void>()
    } as unknown as LayoutService;

    mockUploadManager = {
      queue: signal([]),
      uploadCompleted$: new Subject<void>()
    } as unknown as UploadManagerService;

    mockNotification = {
      success: vi.fn(),
      error: vi.fn()
    } as unknown as NotificationService;

    mockRouter = {
      navigate: vi.fn()
    } as unknown as Router;

    await TestBed.configureTestingModule({
      imports: [FileListComponent],
      providers: [
        { provide: FileService, useValue: mockFileService },
        { provide: FolderService, useValue: mockFolderService },
        { provide: ConnectionStatusService, useValue: mockConnectionStatus },
        { provide: OfflineCacheService, useValue: mockOfflineCache },
        { provide: SyncEngineService, useValue: mockSyncEngine },
        { provide: SearchService, useValue: mockSearchService },
        { provide: LayoutService, useValue: mockLayoutService },
        { provide: UploadManagerService, useValue: mockUploadManager },
        { provide: NotificationService, useValue: mockNotification },
        { provide: Router, useValue: mockRouter },
        provideZonelessChangeDetection(),
        provideAnimations()
      ]
    })
    .overrideComponent(FileListComponent, {
      set: {
        imports: [CommonModule],
        schemas: [NO_ERRORS_SCHEMA]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch files on init', () => {
    fixture.detectChanges();
    expect(mockFileService.getFiles).toHaveBeenCalled();
  });

  it('should format bytes correctly', () => {
    expect(component.formatSize(1024)).toBe('1 KB');
    expect(component.formatSize(1024 * 1024)).toBe('1 MB');
  });

  it('should open context menu on right click', () => {
    const mockEvent = {
       preventDefault: vi.fn(),
       clientX: 100,
       clientY: 200,
       stopPropagation: vi.fn()
    } as unknown as MouseEvent;
    
    component.onContextMenu(mockEvent, { id: 'f1', name: 'test.txt' } as unknown as FileItem);
    
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockLayoutService.openContextMenu).toHaveBeenCalled();
  });
});
