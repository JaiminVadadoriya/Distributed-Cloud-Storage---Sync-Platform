import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FileListComponent } from './file-list.component';
import { FolderService } from '../../../core/services/folder.service';
import { LayoutService, PromptConfig } from '../../../core/services/layout.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UploadManagerService } from '../../../core/services/upload-manager.service';
import { of, Observable } from 'rxjs';
import { Folder } from '../../../core/models/file.model';

describe('FileListComponent - Sharing & Drop', () => {
  let component: FileListComponent;
  let fixture: ComponentFixture<FileListComponent>;
  let folderServiceMock: FolderService;
  let layoutServiceMock: LayoutService;
  let notificationServiceMock: NotificationService;
  let uploadManagerMock: UploadManagerService;

  beforeEach(async () => {
    folderServiceMock = {
      getRootFolders: vi.fn().mockReturnValue(of([])),
      shareFolder: vi.fn().mockReturnValue(of(void 0))
    } as unknown as FolderService;

    layoutServiceMock = {
      openPrompt: vi.fn(),
      openContextMenu: vi.fn(),
      uploadTrigger: vi.fn().mockReturnValue(0),
      newFolderTrigger: vi.fn().mockReturnValue(0)
    } as unknown as LayoutService;

    notificationServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    } as unknown as NotificationService;

    uploadManagerMock = {
      addToQueue: vi.fn()
    } as unknown as UploadManagerService;

    await TestBed.configureTestingModule({
      imports: [FileListComponent],
      providers: [
        { provide: FolderService, useValue: folderServiceMock },
        { provide: LayoutService, useValue: layoutServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: UploadManagerService, useValue: uploadManagerMock }
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
