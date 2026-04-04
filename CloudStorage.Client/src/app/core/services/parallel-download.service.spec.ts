import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ParallelDownloadService } from './parallel-download.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('ParallelDownloadService', () => {
  let service: ParallelDownloadService;
  let apiServiceMock: Mocked<ApiService>;

  beforeEach(() => {
    apiServiceMock = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    } as unknown as Mocked<ApiService>;

    TestBed.configureTestingModule({
      providers: [
        ParallelDownloadService,
        { provide: ApiService, useValue: apiServiceMock }
      ]
    });
    service = TestBed.inject(ParallelDownloadService);

    // Mock window.showSaveFilePicker
    (window as any).showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        abort: vi.fn().mockResolvedValue(undefined)
      })
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: vi.fn().mockReturnValue({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
            .mockResolvedValueOnce({ done: true, value: undefined })
        })
      }
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should orchestrate parallel download successfully', async () => {
    const metadata = {
      fileName: 'test.zip',
      totalSize: 3,
      contentType: 'application/zip',
      chunks: [{ index: 0, size: 3, sasUrl: 'http://sas' }]
    };

    apiServiceMock.get.mockReturnValue(of({ success: true, data: metadata }));

    await service.downloadLargeFile('f1');

    expect(apiServiceMock.get).toHaveBeenCalledWith('/files/f1/download-link');
    expect((window as any).showSaveFilePicker).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith('http://sas');
  });

  it('should throw error if browser not supported', async () => {
    const original = (window as any).showSaveFilePicker;
    delete (window as any).showSaveFilePicker;

    apiServiceMock.get.mockReturnValue(of({ success: true, data: { chunks: [] } }));

    await expect(service.downloadLargeFile('f1')).rejects.toThrow(/BROWSER_UNSUPPORTED/);

    (window as any).showSaveFilePicker = original;
  });

  it('should set isLoading state correctly', async () => {
    const metadata = { fileName: 't.zip', totalSize: 0, contentType: '', chunks: [] };
    apiServiceMock.get.mockReturnValue(of({ success: true, data: metadata }));

    const promise = service.downloadLargeFile('f1');
    expect(service.isLoading()).toBe(true);
    
    await promise;
    expect(service.isLoading()).toBe(false);
  });
});
