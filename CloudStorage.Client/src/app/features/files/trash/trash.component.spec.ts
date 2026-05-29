import '../../../../test-setup';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TrashComponent } from './trash.component';
import { TrashService } from '../../../core/services/trash.service';
import { TrashItem } from '../../../core/models/file.model';
import { NotificationService } from '../../../core/services/notification.service';
import { LayoutService } from '../../../core/services/layout.service';
import { of } from 'rxjs';

describe('TrashComponent', () => {
  let component: TrashComponent;
  let fixture: ComponentFixture<TrashComponent>;
  let trashServiceMock: TrashService;
  let notifyMock: NotificationService;
  let layoutServiceMock: LayoutService;

  beforeEach(async () => {
    trashServiceMock = {
      getTrashItems: vi.fn().mockReturnValue(of([])),
      restoreFile: vi.fn().mockReturnValue(of(undefined)),
      permanentDelete: vi.fn().mockReturnValue(of(undefined)),
      emptyTrash: vi.fn().mockReturnValue(of(undefined))
    } as unknown as TrashService;

    notifyMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn()
    } as unknown as NotificationService;
    
    layoutServiceMock = {
      openConfirm: vi.fn(),
      closeConfirm: vi.fn()
    } as unknown as LayoutService;

    await TestBed.configureTestingModule({
      imports: [TrashComponent],
      providers: [
        { provide: TrashService, useValue: trashServiceMock },
        { provide: NotificationService, useValue: notifyMock },
        { provide: LayoutService, useValue: layoutServiceMock },
        provideZonelessChangeDetection(),
        provideAnimations()
      ]
    })
    .overrideComponent(TrashComponent, {
      set: {
        imports: [CommonModule],
        schemas: [NO_ERRORS_SCHEMA]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrashComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load trash items on init', () => {
    const mockTrash = [{ 
      id: 't1', 
      name: 'deleted.txt', 
      originalId: 'f1', 
      size: 100, 
      type: 'text/plain', 
      deletedAt: new Date().toISOString(), 
      expiresAt: new Date().toISOString(), 
      originalPath: '/root' 
    } as unknown as TrashItem];
    vi.mocked(trashServiceMock.getTrashItems).mockReturnValue(of(mockTrash));
    
    component.ngOnInit();
    fixture.detectChanges();

    expect(trashServiceMock.getTrashItems).toHaveBeenCalled();
    expect(component.trashItems()).toEqual(mockTrash);
  });

  it('should restore item', async () => {
    vi.mocked(trashServiceMock.restoreFile).mockReturnValue(of(undefined));
    await component.onRestore('t1');
    expect(trashServiceMock.restoreFile).toHaveBeenCalledWith('t1');
    expect(notifyMock.success).toHaveBeenCalled();
  });

  it('should trigger purge confirmation', () => {
    component.onPermanentDelete('t1');
    expect(layoutServiceMock.openConfirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'CRITICAL_PURGE'
    }));
  });
});
