import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FolderService } from './folder.service';
import { ApiService } from './api.service';
import { of, throwError, firstValueFrom } from 'rxjs';

describe('FolderService', () => {
  let service: FolderService;
  
  const mockApiService = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FolderService,
        { provide: ApiService, useValue: mockApiService }
      ]
    });
    service = TestBed.inject(FolderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch root folders', async () => {
    const mockFolders = [{ id: '1', name: 'Root Folder', createdAt: new Date().toISOString(), parentId: null }];
    mockApiService.get.mockReturnValue(of({ success: true, data: mockFolders }));

    const folders = await firstValueFrom(service.getRootFolders());
    expect(folders).toEqual(mockFolders);
    expect(mockApiService.get).toHaveBeenCalledWith('/folders/root');
  });

  it('should create a new folder', async () => {
    const newFolder = { id: '2', name: 'New Folder', createdAt: new Date().toISOString(), parentId: null };
    const dto = { name: 'New Folder', parentFolderId: null };
    mockApiService.post.mockReturnValue(of({ success: true, data: newFolder }));

    const folder = await firstValueFrom(service.createFolder(dto));
    expect(folder).toEqual(newFolder);
    expect(mockApiService.post).toHaveBeenCalledWith('/folders', dto);
  });

  it('should rename a folder', async () => {
    const renamedFolder = { id: '1', name: 'Renamed', createdAt: new Date().toISOString(), parentId: null };
    mockApiService.patch.mockReturnValue(of({ success: true, data: renamedFolder }));

    const folder = await firstValueFrom(service.renameFolder('1', 'Renamed'));
    expect(folder).toEqual(renamedFolder);
    expect(mockApiService.patch).toHaveBeenCalledWith('/folders/1/rename', { newName: 'Renamed' });
  });

  it('should delete a folder', async () => {
    mockApiService.delete.mockReturnValue(of({ success: true }));

    await firstValueFrom(service.deleteFolder('1'));
    expect(mockApiService.delete).toHaveBeenCalledWith('/folders/1');
  });

  it('should handle errors gracefully', async () => {
    mockApiService.get.mockReturnValue(throwError(() => new Error('API Error')));
    
    // handleError in BaseService returns [] for getRootFolders on error
    const folders = await firstValueFrom(service.getRootFolders());
    expect(folders).toEqual([]);
  });
});
