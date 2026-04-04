import '../../../../test-setup';
import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
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
import { of } from 'rxjs';

describe('FileListComponent', () => {
  let component: FileListComponent;
  let fixture: ComponentFixture<FileListComponent>;
  let mockFileService: Mocked<FileService>;
  let mockFolderService: Mocked<FolderService>;
  let mockConnectionStatus: Mocked<ConnectionStatusService>;
  let mockOfflineCache: Mocked<OfflineCacheService>;
  let mockSyncEngine: Mocked<SyncEngineService>;
  let mockSearchService: Mocked<SearchService>;
  let mockLayoutService: Mocked<LayoutService>;
  let mockUploadManager: Mocked<UploadManagerService>;
  let mockNotification: Mocked<NotificationService>;
  let mockRouter: Mocked<Router>;

  beforeEach(async () => {
    mockFileService = {
      getFiles: vi.fn().mockReturnValue(of([])),
      deleteFile: vi.fn().mockReturnValue(of(undefined)),
      renameFile: vi.fn().mockReturnValue(of(undefined)),
      isLoading: signal(false)
    } as any;

    mockFolderService = {
      getRootFolders: vi.fn().mockReturnValue(of([])),
      createFolder: vi.fn().mockReturnValue(of({}))
    } as any;

    mockConnectionStatus = {
      isOnline: signal(true),
      isOffline: signal(false)
    } as any;

    mockOfflineCache = {
      getCachedFiles: vi.fn().mockResolvedValue([])
    } as any;

    mockSyncEngine = {
      hasPendingOps: signal(false)
    } as any;

    mockSearchService = {
      query: signal(''),
      suggestions: signal([])
    } as any;

    mockLayoutService = {
      isContextMenuOpen: signal(false),
      openContextMenu: vi.fn(),
      closeContextMenu: vi.fn()
    } as any;

    mockUploadManager = {
      queue: signal([])
    } as any;

    mockNotification = {
      success: vi.fn(),
      error: vi.fn()
    } as any;

    mockRouter = {
      navigate: vi.fn()
    } as any;

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
    } as any;
    
    component.onContextMenu(mockEvent, { id: 'f1', name: 'test.txt' } as any);
    
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockLayoutService.openContextMenu).toHaveBeenCalled();
  });
});
