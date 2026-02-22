import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UploadService, UploadSession, ChunkUploadResponse } from './upload.service';
import { FileChunk } from './chunking.service';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('UploadService', () => {
  let service: UploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UploadService
      ]
    });
    service = TestBed.inject(UploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initiate upload', () => {
    const mockResponse: UploadSession = {
      fileId: 'test-file-id',
      sessionId: 'test-session-id',
      uploadUrl: '/api/files/chunks'
    };

    service.initiateUpload('test.txt', 1024, 1, 'text/plain').subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/files/initiate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      fileName: 'test.txt',
      fileSize: 1024,
      totalChunks: 1,
      contentType: 'text/plain'
    });
    req.flush(mockResponse);
  });

  it('should upload chunk', () => {
    const mockChunk: FileChunk = {
      index: 0,
      size: 1024,
      hash: 'abc123',
      offset: 0,
      data: new Blob(['test data'])
    };

    const mockResponse: ChunkUploadResponse = {
      chunkId: 'chunk-id',
      status: 'uploaded',
      isDuplicate: false
    };

    service.uploadChunk('session-id', mockChunk).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/files/chunks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(mockResponse);
  });

  it('should complete upload', () => {
    const mockResponse = {
      fileId: 'file-id',
      status: 'complete',
      metadata: {
        fileName: 'test.txt',
        size: 1024,
        chunkCount: 1,
        contentType: 'text/plain'
      }
    };

    service.completeUpload('session-id').subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/files/complete');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ sessionId: 'session-id' });
    req.flush(mockResponse);
  });

  it('should get upload status for resume', () => {
    const mockResponse = {
      sessionId: 'session-id',
      uploadedChunks: [0, 1, 2],
      totalChunks: 5,
      status: 'InProgress'
    };

    service.resumeUpload('session-id').subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/files/session/session-id/status');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle errors gracefully', () => {
    service.initiateUpload('test.txt', 1024, 1, 'text/plain').subscribe({
      next: () => expect.fail('should have failed'),
      error: (error) => {
        expect(error).toBeTruthy();
      }
    });

    const req = httpMock.expectOne('/api/files/initiate');
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
  });

});
