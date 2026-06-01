import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockImplementation(async () => {
          return new Uint8Array(32).buffer; // Mock SHA-256 result
        })
      }
    });

    TestBed.configureTestingModule({
      providers: [ChunkingService]
    });
    service = TestBed.inject(ChunkingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return minimum chunk size for small files', () => {
    const smallFile = 10 * 1024 * 1024; // 10MB
    expect(service.getChunkSize(smallFile)).toBe(5 * 1024 * 1024);
  });

  it('should calculate larger chunk size for very large files', () => {
    const hugeFile = 100 * 1024 * 1024 * 1024; // 100GB
    const expected = Math.ceil(hugeFile / 10000);
    expect(service.getChunkSize(hugeFile)).toBe(expected);
  });

  it('should cap chunk size at 1GB', () => {
    const petabyteFile = 1024 * 1024 * 1024 * 1024 * 1024; // 1PB
    expect(service.getChunkSize(petabyteFile)).toBe(1024 * 1024 * 1024);
  });

  it('should split file into correct number of chunks', async () => {
    const content = new Uint8Array(12 * 1024 * 1024); // 12MB
    const file = new File([content], 'test.bin');
    
    // 12MB / 5MB = 3 chunks (5, 5, 2)
    const chunks = await service.splitFileIntoChunks(file);
    
    expect(chunks.length).toBe(3);
    expect(chunks[0].index).toBe(0);
    expect(chunks[1].index).toBe(1);
    expect(chunks[2].index).toBe(2);
    expect(chunks[0].data.size).toBe(5 * 1024 * 1024);
    expect(chunks[2].data.size).toBe(2 * 1024 * 1024);
  });

  it('should generate valid SHA-256 hashes for chunks', async () => {
    const content = new TextEncoder().encode('hello world');
    const file = new File([content], 'test.txt');
    
    const chunks = await service.splitFileIntoChunks(file);
    expect(chunks[0].hash).toBeDefined();
    expect(chunks[0].hash.length).toBe(64); // SHA-256 hex length
  });
});
