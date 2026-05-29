import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SyncEngineService } from './sync-engine.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OfflineCacheService } from './offline-cache.service';
import { ConnectionStatusService } from './connection-status.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { WritableSignal } from '@angular/core';
import { SyncConflict } from '../models/sync.model';
import { CachedFileMetadata } from './offline-cache.service';

describe('SyncEngineService', () => {
  let service: SyncEngineService;
  let httpMock: HttpTestingController;
  let offlineCacheMock: Mocked<OfflineCacheService>;
  let connectionStatusMock: Mocked<ConnectionStatusService>;
  let notificationMock: Mocked<NotificationService>;
  let authMock: { isAuthenticated: boolean };

  beforeEach(() => {
    offlineCacheMock = {
      getLastSyncTimestamp: vi.fn(),
      getCachedFile: vi.fn(),
      updateCachedFile: vi.fn(),
      removeCachedFile: vi.fn(),
      getPendingOperations: vi.fn(),
      setLastSyncTimestamp: vi.fn(),
      removePendingOperation: vi.fn()
    } as unknown as Mocked<OfflineCacheService>;
    
    connectionStatusMock = { 
      isOffline: vi.fn().mockReturnValue(false) 
    } as unknown as Mocked<ConnectionStatusService>;
    
    notificationMock = { 
      success: vi.fn(), 
      error: vi.fn(), 
      warning: vi.fn(), 
      info: vi.fn() 
    } as unknown as Mocked<NotificationService>;
    
    authMock = { isAuthenticated: true };

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
    httpMock = TestBed.inject(HttpTestingController);
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
    expect(service.syncLog()[0].message).toContain('SYNC_ABORTED: System offline.');
  });
  it('should resolve a conflict', async () => {
    const fileId = 'f1';
    const conflict: SyncConflict = {
      fileId,
      fileName: 'conflict.txt',
      localVersionVector: 'v1',
      serverVersionVector: 'v2',
      serverSize: 200,
      serverLastModified: new Date().toISOString(),
      localLastModified: new Date().toISOString(),
      localSize: 100,
      serverVersion: 2
    };
    
    // Setup initial conflict state
    // We need to use update because _conflicts is a private signal accessed via public readonly conflicts
    // Since we are in a test, we can use a type-safe cast
    (service as unknown as { _conflicts: WritableSignal<SyncConflict[]> })._conflicts.set([conflict]);

    const resolutionPromise = service.resolveConflict(fileId, 'KeepServer');

    const req = httpMock.expectOne(`${environment.apiUrl}/sync/resolve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      fileId,
      resolution: 1, // KeepServer is 1
      clientVersionVector: 'v1'
    });
    
    req.flush({ success: true });

    await resolutionPromise;

    expect(service.conflicts()).toHaveLength(0);
    expect(offlineCacheMock.updateCachedFile).toHaveBeenCalled();
  });

  it('should log messages and clear log', () => {
    (service as unknown as { log: (type: string, message: string) => void }).log('info', 'TEST_LOG');
    expect(service.syncLog().length).toBe(1);
    expect(service.syncLog()[0].message).toBe('TEST_LOG');

    service.clearLog();
    expect(service.syncLog().length).toBe(0);
  });

  it('should simulate local edit', async () => {
    const fileId = 'file1';
    const fileName = 'test.txt';
    offlineCacheMock.getCachedFile.mockResolvedValue({ 
      id: fileId, 
      fileName: fileName,
      size: 100,
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      isShared: false,
      versionVector: null
    } as unknown as CachedFileMetadata);

    await service.simulateLocalEdit(fileId, fileName);

    expect(offlineCacheMock.updateCachedFile).toHaveBeenCalledWith(expect.objectContaining({
      id: fileId,
      fileName: fileName,
      versionVector: expect.stringContaining(fileId.substring(0, 8))
    }));
    expect(service.syncLog()[0].message).toContain('INJECT_FORK: Local edit simulated');
  });
});
