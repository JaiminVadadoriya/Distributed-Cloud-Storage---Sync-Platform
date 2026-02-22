import { TestBed } from '@angular/core/testing';
import { UploadManagerService } from './upload-manager.service';
import { UploadService } from './upload.service';
import { ChunkingService } from './chunking.service';
import { of, NEVER } from 'rxjs';
import { vi, type Mock } from 'vitest';

describe('UploadManagerService', () => {
  let service: UploadManagerService;
  let mockUploadService: {
    initiateUpload: unknown;
    uploadChunksWithConcurrency: unknown;
    completeUpload: unknown;
    resumeUpload: unknown;
  };
  let mockChunkingService: {
    splitFileIntoChunks: unknown;
    getChunkSize: unknown;
  };

  beforeEach(() => {
    mockUploadService = {
      initiateUpload: vi.fn(),
      uploadChunksWithConcurrency: vi.fn(),
      completeUpload: vi.fn(),
      resumeUpload: vi.fn()
    };
    mockChunkingService = {
      splitFileIntoChunks: vi.fn(),
      getChunkSize: vi.fn()
    };

    (mockChunkingService.splitFileIntoChunks as Mock).mockResolvedValue([]);
    (mockUploadService.initiateUpload as Mock).mockReturnValue(NEVER);
    (mockUploadService.uploadChunksWithConcurrency as Mock).mockReturnValue(NEVER);
    (mockUploadService.completeUpload as Mock).mockReturnValue(NEVER);
    (mockUploadService.resumeUpload as Mock).mockReturnValue(of({ sessionId: 'sess1', uploadedChunks: [] }));

    TestBed.configureTestingModule({
      providers: [
        UploadManagerService,
        { provide: UploadService, useValue: mockUploadService },
        { provide: ChunkingService, useValue: mockChunkingService }
      ]
    });
    service = TestBed.inject(UploadManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add file to upload queue', async () => {
    const file = new File([''], 'test.txt');
    await service.addToQueue(file);
    
    service.getUploadQueue().subscribe(tasks => {
      expect(tasks.length).toBe(1);
      expect(tasks[0].file).toBe(file);
    });
  });

  it('should pause upload', async () => {
    const file = new File([''], 'test.txt');
    const taskId = await service.addToQueue(file);
    
    service.pauseUpload(taskId);
    service.getUploadQueue().subscribe(tasks => {
      const task = tasks.find(t => t.id === taskId);
      expect(task?.progress.status).toBe('paused');
    });
  });

  it('should resume upload', async () => {
    const file = new File([''], 'test.txt');
    const taskId = await service.addToQueue(file);
    service.pauseUpload(taskId);
    
    // Mock processQueue to prevent auto-starting upload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, 'processQueue').mockImplementation(() => undefined);

    // Manually set sessionId since initiateUpload is mocked to NEVER
    const task = service.getTask(taskId);
    if (task) task.sessionId = 'sess1';

    await service.resumeUpload(taskId);
    
    expect(task?.progress.status).toBe('pending');
  });

  it('should cancel upload', async () => {
    const file = new File([''], 'test.txt');
    const taskId = await service.addToQueue(file);
    
    service.cancelUpload(taskId);
    service.getUploadQueue().subscribe(tasks => {
      const task = tasks.find(t => t.id === taskId);
      expect(task).toBeUndefined();
    });
  });
});
