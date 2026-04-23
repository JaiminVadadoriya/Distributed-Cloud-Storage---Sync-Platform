import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FolderView } from './folder-view';
import { ActivatedRoute, Router } from '@angular/router';
import { FolderService } from '../../../core/services/folder.service';
import { FileService } from '../../../core/services/file.service';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationService } from '../../../core/services/notification.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { UploadManagerService } from '../../../core/services/upload-manager.service';

describe('FolderView', () => {
  let component: FolderView;
  let fixture: ComponentFixture<FolderView>;
  let folderServiceMock: FolderService;
  let fileServiceMock: FileService;
  let layoutServiceMock: LayoutService;
  let notificationServiceMock: NotificationService;
  let uploadManagerMock: UploadManagerService;
  let router: Router;

  const mockFolder = {
    id: 'f1',
    name: 'Images',
    parentId: null,
    createdAt: '2023-01-01T00:00:00Z',
    path: [{ id: 'root', name: 'My Files' }],
    subFolders: [{ id: 'f2', name: 'Vacation', parentId: 'f1', createdAt: '' }],
    files: [{
      id: 'file1',
      name: 'sunset.jpg',
      size: 1024,
      modified: new Date(),
      lastModifiedAt: '2023-01-01T00:00:00Z',
      type: 'image/jpeg',
      owner: 'me',
      versionVector: null
    }]
  };

  beforeEach(async () => {
    folderServiceMock = {
      getFolderById: vi.fn().mockReturnValue(of(mockFolder)),
      getRootFolders: vi.fn().mockReturnValue(of([])),
      createFolder: vi.fn(),
      renameFolder: vi.fn(),
      deleteFolder: vi.fn(),
      moveFolder: vi.fn(),
      shareFolder: vi.fn()
    } as unknown as FolderService;

    fileServiceMock = {
      moveFile: vi.fn(),
      downloadFile: vi.fn(),
      shareFile: vi.fn(),
      deleteFile: vi.fn()
    } as unknown as FileService;

    layoutServiceMock = {
      openContextMenu: vi.fn()
    } as unknown as LayoutService;

    notificationServiceMock = {
      success: vi.fn(),
      error: vi.fn()
    } as unknown as NotificationService;

    uploadManagerMock = {
      uploadCompleted$: of(undefined)
    } as unknown as UploadManagerService;

    await TestBed.configureTestingModule({
      imports: [FolderView, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { params: of({ id: 'f1' }) }
        },
        { provide: FolderService, useValue: folderServiceMock },
        { provide: FileService, useValue: fileServiceMock },
        { provide: LayoutService, useValue: layoutServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: UploadManagerService, useValue: uploadManagerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FolderView);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load folder data on init', () => {
    fixture.detectChanges();

    expect(folderServiceMock.getFolderById).toHaveBeenCalledWith('f1');
    expect(component.folder()).toEqual(mockFolder);
    expect(component.files().length).toBe(1);
    // root + pathology segment + current folder
    expect(component.breadcrumbs().length).toBe(3);
  });

  it('should handle load error', () => {
    vi.mocked(folderServiceMock.getFolderById).mockReturnValue(throwError(() => new Error('API Error')));
    fixture.detectChanges();

    expect(component.isBusy()).toBe(false);
    expect(component.folder()).toBeNull();
  });

  it('should navigate to nested folder', () => {
    const spy = vi.spyOn(router, 'navigate');
    component.navigateTo('f2');
    expect(spy).toHaveBeenCalledWith(['/folders', 'f2']);
  });

  it('should format size correctly', () => {
    expect(component.formatSize(1024)).toBe('1 KB');
    expect(component.formatSize(1024 * 1024)).toBe('1 MB');
  });
});
