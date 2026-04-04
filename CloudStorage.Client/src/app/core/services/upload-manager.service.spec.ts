import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UploadManagerService } from './upload-manager.service';
import { ChunkingService } from './chunking.service';
import { UploadService } from './upload.service';
import { of } from 'rxjs';
import { UploadSession, ChunkUploadResponse, CompleteUploadResponse } from '../models/upload.model';

describe('UploadManagerService', () => {
  let service: UploadManagerService;
  let chunkerMock: Mocked<ChunkingService>;
  let uploaderMock: Mocked<UploadService>;

  beforeEach(() => {
    chunkerMock = {
      splitFileIntoChunks: vi.fn(),
      getChunkSize: vi.fn().mockReturnValue(1024)
    } as unknown as Mocked<ChunkingService>;
    uploaderMock = {
      initiateUpload: vi.fn(),
      uploadChunk: vi.fn(),
      completeUpload: vi.fn(),
      getStatus: vi.fn()
    } as unknown as Mocked<UploadService>;

    TestBed.configureTestingModule({
      providers: [
        UploadManagerService,
        { provide: ChunkingService, useValue: chunkerMock },
        { provide: UploadService, useValue: uploaderMock }
      ]
    });
    service = TestBed.inject(UploadManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add file to queue and start processing', async () => {
    const file = new File(['test'], 'test.txt');
    const mockChunks = [{ index: 0, data: file as unknown as Blob, hash: 'h1' }];
    chunkerMock.splitFileIntoChunks.mockResolvedValue(mockChunks);
    
    const mockSession: UploadSession = { sessionId: 's1', fileId: 'f1', uploadUrl: '/api/upload' };
    uploaderMock.initiateUpload.mockReturnValue(of(mockSession));
    
    const mockChunkResponse: ChunkUploadResponse = { chunkId: 'c1', status: 'success', isDuplicate: false };
    uploaderMock.uploadChunk.mockReturnValue(of(mockChunkResponse));
    
    const mockCompleteResponse: CompleteUploadResponse = { 
      fileId: 'f1', 
      status: 'ready', 
      metadata: { fileName: 'test.txt', size: 4, chunkCount: 1, contentType: 'text/plain' } 
    };
    uploaderMock.completeUpload.mockReturnValue(of(mockCompleteResponse));

    const id = await service.addToQueue(file);
    
    expect(id).toBeDefined();
    expect(service.queue().length).toBe(1);
    expect(service.queue()[0].fileName).toBe('test.txt');
    
    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const task = service.queue()[0];
    expect(task.status).toBe('complete');
    expect(uploaderMock.initiateUpload).toHaveBeenCalled();
    expect(uploaderMock.uploadChunk).toHaveBeenCalled();
    expect(uploaderMock.completeUpload).toHaveBeenCalled();
  });

  it('should handle upload errors gracefully', async () => {
    const file = new File(['test'], 'test.txt');
    chunkerMock.splitFileIntoChunks.mockResolvedValue([{ index: 0, data: file as unknown as Blob, hash: 'h1' }]);
    uploaderMock.initiateUpload.mockReturnValue(of(null as unknown as UploadSession)); // Handshake fail

    await service.addToQueue(file);
    await new Promise(resolve => setTimeout(resolve, 100));

    const task = service.queue()[0];
    expect(task.status).toBe('error');
    expect(task.error).toBe('HANDSHAKE_REJECTED');
  });

  it('should clear completed tasks', async () => {
    const file = new File(['test'], 'test.txt');
    chunkerMock.splitFileIntoChunks.mockResolvedValue([{ index: 0, data: file as unknown as Blob, hash: 'h1' }]);
    
    const mockSession: UploadSession = { sessionId: 's1', fileId: 'f1', uploadUrl: '/api/upload' };
    uploaderMock.initiateUpload.mockReturnValue(of(mockSession));
    uploaderMock.uploadChunk.mockReturnValue(of({ chunkId: 'c1', status: 'success', isDuplicate: false }));
    uploaderMock.completeUpload.mockReturnValue(of({ 
      fileId: 'f1', status: 'ready', 
      metadata: { fileName: 'test.txt', size: 4, chunkCount: 1, contentType: 'text/plain' } 
    }));

    await service.addToQueue(file);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(service.queue().length).toBe(1);
    service.clearCompleted();
    expect(service.queue().length).toBe(0);
  });

  it('should calculate global speed correctly', async () => {
    const file = new File(['test'], 'test.txt');
    chunkerMock.splitFileIntoChunks.mockResolvedValue([{ index: 0, data: file as unknown as Blob, hash: 'h1' }]);
    
    const mockSession: UploadSession = { sessionId: 's1', fileId: 'f1', uploadUrl: '/api/upload' };
    uploaderMock.initiateUpload.mockReturnValue(of(mockSession));
    uploaderMock.uploadChunk.mockReturnValue(of({ chunkId: 'c1', status: 'success', isDuplicate: false }));
    uploaderMock.completeUpload.mockReturnValue(of({ 
      fileId: 'f1', status: 'ready', 
      metadata: { fileName: 'test.txt', size: 4, chunkCount: 1, contentType: 'text/plain' } 
    }));

    await service.addToQueue(file);
    // Setting manual speed for test
    const task = Array.from((service as unknown as { _tasks: () => Map<string, unknown> })._tasks().values())[0] as { status: string; uploadSpeed: number };
    task.uploadSpeed = 500;
    task.status = 'uploading';
    (service as unknown as { updateTask: (t: unknown) => void }).updateTask(task);

    expect(service.globalSpeed()).toBe(500);
  });
});
