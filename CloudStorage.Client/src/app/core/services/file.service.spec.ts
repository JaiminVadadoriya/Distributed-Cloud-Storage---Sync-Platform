import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FileService } from './file.service';
import { ApiFileResponse, DashboardStats } from '../models/file.model';
import { ApiService } from './api.service';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ParallelDownloadService } from './parallel-download.service';

describe('FileService', () => {
  let service: FileService;
  let apiServiceMock: Mocked<ApiService>;
  let parallelDownloadMock: ParallelDownloadService;

  beforeEach(() => {
    apiServiceMock = { 
      get: vi.fn(), 
      delete: vi.fn(), 
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn()
    } as unknown as Mocked<ApiService>;

    parallelDownloadMock = {
      downloadLargeFile: vi.fn()
    } as unknown as ParallelDownloadService;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FileService,
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ParallelDownloadService, useValue: parallelDownloadMock }
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
    
    // Correct mock structure: ApiResponse<ApiFileResponse[]>
    apiServiceMock.get.mockReturnValue(of({ success: true, data: apiFiles }));

    service.getFiles().subscribe(files => {
      expect(files.length).toBe(1);
      expect(files[0].name).toBe('test.pdf');
      expect(files[0].type).toBe('pdf');
      expect(files[0].owner).toBe('me');
    });

    expect(apiServiceMock.get).toHaveBeenCalledWith('/files');
  });

  it('should get dashboard stats', () => {
    const mockStats: DashboardStats = { totalStorageBytes: 100, maxStorageBytes: 200, totalFiles: 5, recentUploads: 1 };
    apiServiceMock.get.mockReturnValue(of({ success: true, data: mockStats }));
    
    service.getDashboardStats().subscribe(stats => {
      expect(stats).toEqual(mockStats);
    });
    expect(apiServiceMock.get).toHaveBeenCalledWith('/files/stats');
  });

  it('should call delete endpoint on deleteFile', () => {
    apiServiceMock.delete.mockReturnValue(of({ success: true }));
    service.deleteFile('1').subscribe();
    expect(apiServiceMock.delete).toHaveBeenCalledWith('/files/1');
  });

  it('should get storage breakdown', () => {
    const mockBreakdown = [{ category: 'Docs', bytes: 100, count: 1, color: '#000' }];
    apiServiceMock.get.mockReturnValue(of({ success: true, data: mockBreakdown }));
    
    service.getStorageBreakdown().subscribe(data => {
      expect(data).toEqual(mockBreakdown);
    });
  });
});
