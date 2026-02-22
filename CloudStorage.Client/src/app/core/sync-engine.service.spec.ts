import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SyncEngineService } from './sync-engine.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OfflineCacheService } from './offline-cache.service';
import { ConnectionStatusService } from './connection-status.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

describe('SyncEngineService', () => {
  let service: SyncEngineService;
  let offlineCacheMock: any;
  let connectionStatusMock: any;
  let notificationMock: any;
  let authMock: any;

  beforeEach(() => {
    offlineCacheMock = {
      getLastSyncTimestamp: vi.fn(),
      getCachedFile: vi.fn(),
      updateCachedFile: vi.fn(),
      removeCachedFile: vi.fn(),
      getPendingOperations: vi.fn(),
      setLastSyncTimestamp: vi.fn()
    } as any;
    connectionStatusMock = { isOffline: vi.fn() } as any;
    notificationMock = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } as any;
    authMock = { isAuthenticated: true } as any;

    TestBed.configureTestingModule({
      providers: [
        SyncEngineService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OfflineCacheService, useValue: offlineCacheMock },
        { provide: ConnectionStatusService, useValue: connectionStatusMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: AuthService, useValue: authMock }
      ]
    });
    service = TestBed.inject(SyncEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isSyncing()).toBe(false);
    expect(service.hasConflicts()).toBe(false);
  });

  it('should not sync if offline', async () => {
    connectionStatusMock.isOffline.mockReturnValue(true);
    await service.performSync();
    expect(service.isSyncing()).toBe(false);
    expect(offlineCacheMock.getLastSyncTimestamp).not.toHaveBeenCalled();
  });
});
