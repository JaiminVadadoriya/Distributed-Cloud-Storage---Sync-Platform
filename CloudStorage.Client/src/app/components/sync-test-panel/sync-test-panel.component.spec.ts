import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { SyncTestPanelComponent } from './sync-test-panel.component';
import { SyncEngineService } from '../../core/sync-engine.service';
import { OfflineCacheService } from '../../core/offline-cache.service';
import { ConnectionStatusService } from '../../core/connection-status.service';
import { signal } from '@angular/core';

describe('SyncTestPanelComponent', () => {
  let component: SyncTestPanelComponent;
  let fixture: ComponentFixture<SyncTestPanelComponent>;
  let syncEngineMock: any;
  let offlineCacheMock: any;
  let connectionStatusMock: any;

  beforeEach(async () => {
    syncEngineMock = {
      isSyncing: signal(false),
      conflicts: signal([]),
      hasConflicts: signal(false),
      syncLog: signal([]),
      performSync: vi.fn().mockResolvedValue(undefined),
      simulateLocalEdit: vi.fn().mockResolvedValue(undefined),
      clearLog: vi.fn()
    };

    offlineCacheMock = {
      getCachedFiles: vi.fn().mockResolvedValue([]),
    };

    connectionStatusMock = {
      isOnline: vi.fn().mockReturnValue(true),
      isOffline: vi.fn().mockReturnValue(false)
    };

    await TestBed.configureTestingModule({
      imports: [SyncTestPanelComponent],
      providers: [
        { provide: SyncEngineService, useValue: syncEngineMock },
        { provide: OfflineCacheService, useValue: offlineCacheMock },
        { provide: ConnectionStatusService, useValue: connectionStatusMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SyncTestPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should refresh cached files on init', () => {
    expect(offlineCacheMock.getCachedFiles).toHaveBeenCalled();
  });

  it('should simulate edit', async () => {
    const file = { id: '1', fileName: 'test.txt' } as any;
    await component.simulateEdit(file);

    expect(syncEngineMock.simulateLocalEdit).toHaveBeenCalledWith('1', 'test.txt');
    expect(component.simulatedFileIds().has('1')).toBe(true);
  });

  it('should run sync and refresh files', async () => {
    await component.runSync();
    expect(syncEngineMock.performSync).toHaveBeenCalled();
    expect(offlineCacheMock.getCachedFiles).toHaveBeenCalledTimes(2); // once on init, once after sync
  });

  it('should clear log', () => {
    component.clearLog();
    expect(syncEngineMock.clearLog).toHaveBeenCalled();
  });

  it('should format log time correctly', () => {
    const date = new Date(2025, 0, 1, 12, 30, 45);
    const formatted = component.formatLogTime(date);
    expect(formatted).toBe('12:30:45');
  });
});
