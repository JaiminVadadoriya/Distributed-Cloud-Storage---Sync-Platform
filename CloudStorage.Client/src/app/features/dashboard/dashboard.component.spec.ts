import '../../../test-setup';
import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { signal, NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DashboardComponent } from './dashboard.component';
import { FileService } from '../../core/services/file.service';
import { LayoutService } from '../../core/services/layout.service';
import { OfflineCacheService } from '../../core/services/offline-cache.service';
import { SyncEngineService } from '../../core/services/sync-engine.service';
import { ConnectionStatusService } from '../../core/services/connection-status.service';
import { ActivityService } from '../../core/services/activity.service';
import { SignalRService } from '../../core/services/signalr.service';
import { NotificationService } from '../../core/services/notification.service';
import { FolderService } from '../../core/services/folder.service';
import { UploadManagerService } from '../../core/services/upload-manager.service';
import { of } from 'rxjs';
import { SearchService } from '../../core/services/search.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterTestingModule } from '@angular/router/testing';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let fileServiceMock: Mocked<FileService>;
  let layoutServiceMock: Mocked<LayoutService>;
  let syncEngineMock: SyncEngineService;
  let connectionStatusMock: ConnectionStatusService;
  let offlineCacheMock: OfflineCacheService;
  let folderServiceMock: FolderService;
  let notificationServiceMock: NotificationService;
  let activityServiceMock: ActivityService;
  let signalRServiceMock: SignalRService;
  let uploadManagerMock: UploadManagerService;
  let searchServiceMock: SearchService;
  let authServiceMock: AuthService;

  beforeEach(async () => {
    fileServiceMock = { 
      getDashboardStats: vi.fn().mockReturnValue(of({ totalStorageBytes: 0, maxStorageBytes: 100, totalFiles: 0, recentUploads: 0 })),
      getFiles: vi.fn().mockReturnValue(of([])),
      getStorageBreakdown: vi.fn().mockReturnValue(of([])),
      isLoading: signal(false)
    } as unknown as Mocked<FileService>;

    layoutServiceMock = {
      isUploadModalOpen: signal(false),
      isSidebarOpen: signal(false),
      isNotificationDropdownOpen: signal(false),
      isProfileMenuOpen: signal(false),
      isContextMenuOpen: signal(false),
      openUploadModal: vi.fn(),
      closeUploadModal: vi.fn(),
      toggleSidebar: vi.fn(),
      toggleNotificationDropdown: vi.fn(),
      closeNotificationDropdown: vi.fn(),
      toggleProfileMenu: vi.fn(),
      closeProfileMenu: vi.fn(),
      closeAllOverlays: vi.fn()
    } as unknown as Mocked<LayoutService>;

    syncEngineMock = {
      hasConflicts: signal(false),
      conflicts: signal([]),
      hasPendingOps: signal(false),
      pendingOpsCount: signal(0),
      refreshPendingOpsCount: vi.fn()
    } as unknown as SyncEngineService;

    connectionStatusMock = {
      isOnline: signal(true),
      isOffline: signal(false)
    } as unknown as ConnectionStatusService;

    offlineCacheMock = {
      getCachedFiles: vi.fn().mockResolvedValue([]),
      cacheFiles: vi.fn().mockResolvedValue(undefined)
    } as unknown as OfflineCacheService;

    folderServiceMock = {
      createFolder: vi.fn(),
      getRootFolders: vi.fn().mockReturnValue(of([]))
    } as unknown as FolderService;

    notificationServiceMock = {
      success: vi.fn(),
      error: vi.fn()
    } as unknown as NotificationService;

    activityServiceMock = {
        getRecentActivity: vi.fn().mockReturnValue(of([]))
    } as unknown as ActivityService;

    signalRServiceMock = {
      startConnection: vi.fn().mockResolvedValue(undefined),
      stopConnection: vi.fn(),
      isConnected: signal(true)
    } as unknown as Mocked<SignalRService>;

    uploadManagerMock = {
        queue: signal([])
    } as unknown as UploadManagerService;

    searchServiceMock = {
        query: signal(''),
        suggestions: signal([]),
        updateQuery: vi.fn(),
        addToHistory: vi.fn()
    } as unknown as SearchService;

    authServiceMock = {
        currentUser: signal({ username: 'Test User' }),
        logout: vi.fn()
    } as unknown as AuthService;

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule],
      providers: [
        { provide: FileService, useValue: fileServiceMock },
        { provide: LayoutService, useValue: layoutServiceMock },
        { provide: SyncEngineService, useValue: syncEngineMock },
        { provide: ConnectionStatusService, useValue: connectionStatusMock },
        { provide: OfflineCacheService, useValue: offlineCacheMock },
        { provide: FolderService, useValue: folderServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ActivityService, useValue: activityServiceMock },
        { provide: SignalRService, useValue: signalRServiceMock },
        { provide: UploadManagerService, useValue: uploadManagerMock },
        { provide: SearchService, useValue: searchServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        provideZonelessChangeDetection(),
        provideAnimations()
      ]
    })
    .overrideComponent(DashboardComponent, {
      set: {
        imports: [CommonModule, RouterTestingModule],
        schemas: [NO_ERRORS_SCHEMA]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format bytes correctly', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('should delegate upload modal state to LayoutService', () => {
    component.layoutService.openUploadModal();
    expect(layoutServiceMock.openUploadModal).toHaveBeenCalled();

    component.layoutService.closeUploadModal();
    expect(layoutServiceMock.closeUploadModal).toHaveBeenCalled();
  });
});
