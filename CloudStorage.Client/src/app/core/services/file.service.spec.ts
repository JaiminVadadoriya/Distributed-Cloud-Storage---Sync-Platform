import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FileService, ApiFileResponse, DashboardStats } from './file.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('FileService', () => {
  let service: FileService;
  let apiServiceMock: any;

  beforeEach(() => {
    apiServiceMock = { get: vi.fn(), delete: vi.fn(), post: vi.fn() } as any;

    TestBed.configureTestingModule({
      providers: [
        FileService,
        { provide: ApiService, useValue: apiServiceMock }
      ]
    });
    service = TestBed.inject(FileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should map getFiles successfully', () => {
    const apiFiles: ApiFileResponse[] = [{
      id: '1',
      fileName: 'test.pdf',
      size: 1024,
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      isShared: false,
      versionVector: '1:1'
    }];
    apiServiceMock.get.mockReturnValue(of(apiFiles));

    service.getFiles().subscribe(files => {
      expect(files.length).toBe(1);
      expect(files[0].name).toBe('test.pdf');
      expect(files[0].type).toBe('pdf');
      expect(files[0].owner).toBe('me');
    });

    expect(apiServiceMock.get).toHaveBeenCalledWith('/files');
  });

  it('should call delete endpoint on deleteFile', () => {
    apiServiceMock.delete.mockReturnValue(of(null));
    service.deleteFile('1').subscribe();
    expect(apiServiceMock.delete).toHaveBeenCalledWith('/files/1');
  });

  it('should call delete endpoint on deleteAllFiles', () => {
    apiServiceMock.delete.mockReturnValue(of(null));
    service.deleteAllFiles().subscribe();
    expect(apiServiceMock.delete).toHaveBeenCalledWith('/files/all');
  });

  it('should get dashboard stats', () => {
    const mockStats: DashboardStats = { totalStorageBytes: 100, maxStorageBytes: 200, totalFiles: 5, recentUploads: 1 };
    apiServiceMock.get.mockReturnValue(of(mockStats));
    service.getDashboardStats().subscribe(stats => {
      expect(stats).toEqual(mockStats);
    });
    expect(apiServiceMock.get).toHaveBeenCalledWith('/files/stats');
  });
});
