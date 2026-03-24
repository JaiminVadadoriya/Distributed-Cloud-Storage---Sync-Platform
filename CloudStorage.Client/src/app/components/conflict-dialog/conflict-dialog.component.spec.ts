import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ConflictDialogComponent } from './conflict-dialog.component';
import { SyncEngineService } from '../../core/sync-engine.service';
import { ConflictInfo } from '../../core/sync-engine.service';

describe('ConflictDialogComponent', () => {
  let component: ConflictDialogComponent;
  let fixture: ComponentFixture<ConflictDialogComponent>;
  let syncEngineMock: any;

  const mockConflicts: ConflictInfo[] = [
    {
      fileId: 'file1',
      fileName: 'test.txt',
      localLastModified: new Date().toISOString(),
      serverLastModified: new Date().toISOString(),
      localVersionVector: '{"a":1}',
      serverVersionVector: '{"a":2}',
      serverSize: 1024,
      serverVersion: 2
    }
  ];

  beforeEach(async () => {
    syncEngineMock = {
      resolveConflict: vi.fn().mockResolvedValue(undefined),
      resolveAllConflicts: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [ConflictDialogComponent],
      providers: [
        { provide: SyncEngineService, useValue: syncEngineMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConflictDialogComponent);
    component = fixture.componentInstance;
    // Set required input
    fixture.componentRef.setInput('conflicts', mockConflicts);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit closed when close is called', () => {
    const spy = vi.spyOn(component.closed, 'emit');
    component.close();
    expect(spy).toHaveBeenCalled();
  });

  it('should resolve one and emit resolved', async () => {
    const spy = vi.spyOn(component.resolved, 'emit');
    await component.resolveOne('file1', 'KeepLocal');

    expect(syncEngineMock.resolveConflict).toHaveBeenCalledWith('file1', 'KeepLocal');
    expect(spy).toHaveBeenCalledWith({ fileId: 'file1', resolution: 'KeepLocal' });
  });

  it('should resolve all and emit closed', async () => {
    const spy = vi.spyOn(component.closed, 'emit');
    // Simulate multiple conflicts for resolveAll visibility
    fixture.componentRef.setInput('conflicts', [...mockConflicts, { ...mockConflicts[0], fileId: 'file2' }]);
    fixture.detectChanges();

    await component.resolveAll('KeepServer');

    expect(syncEngineMock.resolveAllConflicts).toHaveBeenCalledWith('KeepServer');
    expect(spy).toHaveBeenCalled();
  });
});
