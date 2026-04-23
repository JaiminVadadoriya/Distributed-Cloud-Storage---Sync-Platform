import { vi, describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FileListComponent } from './file-list.component';
import { FolderService } from '../../../core/services/folder.service';
import { LayoutService, PromptConfig } from '../../../core/services/layout.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UploadManagerService } from '../../../core/services/upload-manager.service';
import { FileService } from '../../../core/services/file.service';
import { ConnectionStatusService } from '../../../core/services/connection-status.service';
import { OfflineCacheService } from '../../../core/services/offline-cache.service';
import { SyncEngineService } from '../../../core/services/sync-engine.service';
import { SearchService } from '../../../core/services/search.service';
import { of, Observable, Subject } from 'rxjs';
import { Folder } from '../../../core/models/file.model';

describe('FileListComponent - Sharing & Drop', () => {
  let component: FileListComponent;
  let fixture: ComponentFixture<FileListComponent>;
  let folderServiceMock: FolderService;
  let layoutServiceMock: LayoutService;
  let notificationServiceMock: NotificationService;
  let uploadManagerMock: UploadManagerService;
  let fileServiceMock: FileService;
  let connectionStatusMock: ConnectionStatusService;
  let offlineCacheMock: OfflineCacheService;
  let syncEngineMock: SyncEngineService;
  let searchServiceMock: SearchService;
  let routerMock: Router;

  beforeEach(async () => {
    folderServiceMock = {
      getRootFolders: vi.fn().mockReturnValue(of([])),
      shareFolder: vi.fn().mockReturnValue(of(void 0)),
      createFolder: vi.fn().mockReturnValue(of({}))
    } as unknown as FolderService;

    layoutServiceMock = {
      openPrompt: vi.fn(),
      openContextMenu: vi.fn(),
      uploadTrigger$: new Subject<void>(),
      newFolderTrigger$: new Subject<void>()
    } as unknown as LayoutService;

    notificationServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    } as unknown as NotificationService;

    uploadManagerMock = {
      addToQueue: vi.fn(),
      uploadCompleted$: new Subject<void>()
    } as unknown as UploadManagerService;

    fileServiceMock = {
      getFiles: vi.fn().mockReturnValue(of([])),
      isLoading: signal(false)
    } as unknown as FileService;

    connectionStatusMock = {
      isOnline: signal(true),
      isOffline: signal(false)
    } as unknown as ConnectionStatusService;

    offlineCacheMock = {
      getCachedFiles: vi.fn().mockResolvedValue([])
    } as unknown as OfflineCacheService;

    syncEngineMock = {
      hasPendingOps: signal(false)
    } as unknown as SyncEngineService;

    searchServiceMock = {
      query: signal(''),
      filters: signal({}),
      hasActiveFilters: signal(false)
    } as unknown as SearchService;

    routerMock = {
      navigate: vi.fn()
    } as unknown as Router;

    await TestBed.configureTestingModule({
      imports: [FileListComponent],
      providers: [
        { provide: FolderService, useValue: folderServiceMock },
        { provide: LayoutService, useValue: layoutServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: UploadManagerService, useValue: uploadManagerMock },
        { provide: FileService, useValue: fileServiceMock },
        { provide: ConnectionStatusService, useValue: connectionStatusMock },
        { provide: OfflineCacheService, useValue: offlineCacheMock },
        { provide: SyncEngineService, useValue: syncEngineMock },
        { provide: SearchService, useValue: searchServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FileListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should call shareFolder when shareFolder is triggered with a valid ID', () => {
    const folder: Folder = { id: 'folder-1', name: 'Test Folder', createdAt: new Date().toISOString(), parentId: null };
    
    // Simulate openPrompt callback
    vi.mocked(layoutServiceMock.openPrompt).mockImplementation((config: PromptConfig) => {
      config.action('123'); // User enters ID 123
    });

    component.shareFolder(folder);

    expect(layoutServiceMock.openPrompt).toHaveBeenCalled();
    expect(folderServiceMock.shareFolder).toHaveBeenCalledWith('folder-1', 123);
    expect(notificationServiceMock.success).toHaveBeenCalledWith(expect.stringContaining('SHARE_SUCCESS'));
  });

  it('should handle sharing error', () => {
    const folder: Folder = { id: 'folder-1', name: 'Test Folder', createdAt: new Date().toISOString(), parentId: null };
    vi.mocked(layoutServiceMock.openPrompt).mockImplementation((config: PromptConfig) => config.action('123'));
    vi.mocked(folderServiceMock.shareFolder).mockReturnValue(new Observable(subscriber => {
      subscriber.error(new Error('API Error'));
    }));

    component.shareFolder(folder);

    expect(notificationServiceMock.error).toHaveBeenCalledWith(expect.stringContaining('Sharing protocol failed'));
  });

  it('should call uploadManager.addToQueue when external files are dropped onto a folder', () => {
    const folderId = 'target-folder-id';
    const mockFile = new File(['test'], 'hello.txt');
    const mockFileList = [mockFile] as unknown as FileList;

    component.onExternalFilesDroppedIntoFolder(mockFileList, folderId);

    expect(uploadManagerMock.addToQueue).toHaveBeenCalledWith(mockFile, folderId);
    expect(notificationServiceMock.info).toHaveBeenCalledWith(expect.stringContaining('UPLOADING_TO_FOLDER'));
  });
});
