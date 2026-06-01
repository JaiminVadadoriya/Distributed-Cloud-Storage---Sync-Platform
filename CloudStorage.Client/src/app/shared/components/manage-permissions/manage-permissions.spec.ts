import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManagePermissions } from './manage-permissions';
import { FileService } from '../../../core/services/file.service';
import { NotificationService } from '../../../core/services/notification.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { Permission } from '../../../core/models/file.model';

describe('ManagePermissions', () => {
  let component: ManagePermissions;
  let fixture: ComponentFixture<ManagePermissions>;
  let fileServiceMock: Mocked<FileService>;
  let notifyMock: Mocked<NotificationService>;

  beforeEach(async () => {
    fileServiceMock = {
      getFilePermissions: vi.fn(),
      removePermission: vi.fn(),
      updatePermission: vi.fn(),
      getFiles: vi.fn(),
      deleteFile: vi.fn(),
      deleteAllFiles: vi.fn(),
      downloadFile: vi.fn(),
      getStorageUsage: vi.fn(),
      getDashboardStats: vi.fn(),
      getFileById: vi.fn(),
      renameFile: vi.fn(),
      moveFile: vi.fn(),
      getFileVersions: vi.fn(),
      restoreVersion: vi.fn(),
      bulkDelete: vi.fn(),
      bulkMove: vi.fn(),
      bulkShare: vi.fn(),
      getSharedFiles: vi.fn(),
      isLoading: signal(false)
    } as unknown as Mocked<FileService>;

    notifyMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      toasts: signal([]),
      notifications: signal([]),
      unreadCount: signal(0),
      show: vi.fn(),
      removeNotification: vi.fn()
    } as unknown as Mocked<NotificationService>;

    await TestBed.configureTestingModule({
      imports: [ManagePermissions],
      providers: [
        { provide: FileService, useValue: fileServiceMock },
        { provide: NotificationService, useValue: notifyMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManagePermissions);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('fileId', 'file_1');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load permissions on init', () => {
    const mockPerms: Permission[] = [{ 
      userId: 1, 
      userName: 'Test User', 
      email: 'test@test.com', 
      permissionType: 'Read',
      grantedAt: new Date().toISOString() 
    }];
    fileServiceMock.getFilePermissions.mockReturnValue(of(mockPerms));

    fixture.detectChanges();

    expect(fileServiceMock.getFilePermissions).toHaveBeenCalledWith('file_1');
    expect(component.permissions()).toEqual(mockPerms);
  });

  it('should remove access', () => {
    fileServiceMock.removePermission.mockReturnValue(of(undefined));
    fileServiceMock.getFilePermissions.mockReturnValue(of([]));
    
    component.removeAccess(1);

    expect(fileServiceMock.removePermission).toHaveBeenCalledWith('file_1', 1);
    expect(notifyMock.success).toHaveBeenCalled();
  });

  it('should update role', () => {
    fileServiceMock.updatePermission.mockReturnValue(of(undefined));
    fileServiceMock.getFilePermissions.mockReturnValue(of([]));

    component.changeRole(1, 'Editor');

    expect(fileServiceMock.updatePermission).toHaveBeenCalledWith('file_1', 1, 'Editor');
    expect(notifyMock.success).toHaveBeenCalled();
  });
});
