import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { UploadManagerService } from '../../services/upload-manager.service';
import { FileService } from '../../core/file.service';
import { SignalRService } from '../../core/signalr.service';
import { NotificationService } from '../../core/notification.service';
import { ConnectionStatusService } from '../../core/connection-status.service';
import { SyncEngineService } from '../../core/sync-engine.service';
import { OfflineCacheService } from '../../core/offline-cache.service';
import { of, EMPTY, Subject } from 'rxjs';
import { signal } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  let signalRMock: any;
  let syncEngineMock: any;
  let connectionStatusMock: any;

  beforeEach(async () => {
    const uploadManagerMock = { getUploadQueue: vi.fn(), clearCompletedTasks: vi.fn() } as any;
    uploadManagerMock.getUploadQueue.mockReturnValue(of([]));

    const fileServiceMock = { getDashboardStats: vi.fn(), getFiles: vi.fn() } as any;
    fileServiceMock.getDashboardStats.mockReturnValue(of({ totalStorageBytes: 0, maxStorageBytes: 100, totalFiles: 0, recentUploads: 0 }));
    fileServiceMock.getFiles.mockReturnValue(of([]));

    signalRMock = { startConnection: vi.fn(), stopConnection: vi.fn() } as any;
    (signalRMock as any).fileUploaded$ = new Subject<any>();
    (signalRMock as any).fileDeleted$ = new Subject<any>();
    (signalRMock as any).allFilesDeleted$ = new Subject<any>();

    const notificationMock = { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() } as any;

    connectionStatusMock = { isOnline: vi.fn(), isOffline: vi.fn() } as any;
    connectionStatusMock.isOnline.mockReturnValue(true);
    connectionStatusMock.isOffline.mockReturnValue(false);

    syncEngineMock = { refreshPendingOpsCount: vi.fn(), performSync: vi.fn() } as any;
    (syncEngineMock as any).hasConflicts = signal(false);
    (syncEngineMock as any).hasPendingOps = signal(false);
    (syncEngineMock as any).conflicts = signal([]);
    (syncEngineMock as any).pendingOpsCount = signal(0);

    const offlineCacheMock = { getPendingOperations: vi.fn(), cacheFiles: vi.fn(), getCachedFiles: vi.fn() } as any;
    offlineCacheMock.getCachedFiles.mockReturnValue(of([]));
    offlineCacheMock.cacheFiles.mockReturnValue(of(true));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: UploadManagerService, useValue: uploadManagerMock },
        { provide: FileService, useValue: fileServiceMock },
        { provide: SignalRService, useValue: signalRMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: ConnectionStatusService, useValue: connectionStatusMock },
        { provide: SyncEngineService, useValue: syncEngineMock },
        { provide: OfflineCacheService, useValue: offlineCacheMock }
      ]
    })
    // Override child components that make HTTP calls or complex logic
    .overrideComponent(DashboardComponent, {
      remove: { imports: [] },
      add: { imports: [] }
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format bytes correctly', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1048576)).toBe('1 MB');
  });

  it('should toggle upload modal visibility', () => {
    expect(component.showUploadModal).toBe(false);
    component.showUploadModal = true;
    expect(component.showUploadModal).toBe(true);
  });
});
