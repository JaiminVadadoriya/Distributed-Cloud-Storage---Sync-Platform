import { TestBed } from '@angular/core/testing';
import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChunkingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return correct chunk size (5MB)', () => {
    expect(service.getChunkSize(1024)).toBe(5 * 1024 * 1024);
  });

  it('should calculate correct number of chunks', () => {
    const fileSize10MB = 10 * 1024 * 1024;
    expect(service.calculateTotalChunks(fileSize10MB)).toBe(2);

    const fileSize15MB = 15 * 1024 * 1024;
    expect(service.calculateTotalChunks(fileSize15MB)).toBe(3);

    const fileSize5MB = 5 * 1024 * 1024;
    expect(service.calculateTotalChunks(fileSize5MB)).toBe(1);

    const fileSize1MB = 1 * 1024 * 1024;
    expect(service.calculateTotalChunks(fileSize1MB)).toBe(1);
  });

  it('should split file into correct number of chunks', async () => {
    // Create a mock file of 12MB
    const fileSize = 12 * 1024 * 1024;
    const mockFile = new File([new ArrayBuffer(fileSize)], 'test.bin', { type: 'application/octet-stream' });

    const chunks = await service.splitFileIntoChunks(mockFile);

    expect(chunks.length).toBe(3); // 12MB / 5MB = 3 chunks
    expect(chunks[0].size).toBe(5 * 1024 * 1024); // First chunk: 5MB
    expect(chunks[1].size).toBe(5 * 1024 * 1024); // Second chunk: 5MB
    expect(chunks[2].size).toBe(2 * 1024 * 1024); // Last chunk: 2MB
  });

  it('should generate correct chunk indices', async () => {
    const fileSize = 10 * 1024 * 1024;
    const mockFile = new File([new ArrayBuffer(fileSize)], 'test.bin', { type: 'application/octet-stream' });

    const chunks = await service.splitFileIntoChunks(mockFile);

    expect(chunks[0].index).toBe(0);
    expect(chunks[1].index).toBe(1);
  });

  it('should generate correct chunk offsets', async () => {
    const fileSize = 10 * 1024 * 1024;
    const mockFile = new File([new ArrayBuffer(fileSize)], 'test.bin', { type: 'application/octet-stream' });

    const chunks = await service.splitFileIntoChunks(mockFile);

    expect(chunks[0].offset).toBe(0);
    expect(chunks[1].offset).toBe(5 * 1024 * 1024);
  });

  it('should calculate SHA-256 hash for chunks', async () => {
    const testData = new Blob(['test data']);
    const hash = await service.calculateChunkHash(testData);

    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true); // Should be valid hex
  });

  it('should produce consistent hashes for same data', async () => {
    const testData1 = new Blob(['identical data']);
    const testData2 = new Blob(['identical data']);

    const hash1 = await service.calculateChunkHash(testData1);
    const hash2 = await service.calculateChunkHash(testData2);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different data', async () => {
    const testData1 = new Blob(['data one']);
    const testData2 = new Blob(['data two']);

    const hash1 = await service.calculateChunkHash(testData1);
    const hash2 = await service.calculateChunkHash(testData2);

    expect(hash1).not.toBe(hash2);
  });

  it('should handle files smaller than chunk size', async () => {
    const fileSize = 1 * 1024 * 1024; // 1MB
    const mockFile = new File([new ArrayBuffer(fileSize)], 'small.bin', { type: 'application/octet-stream' });

    const chunks = await service.splitFileIntoChunks(mockFile);

    expect(chunks.length).toBe(1);
    expect(chunks[0].size).toBe(fileSize);
    expect(chunks[0].index).toBe(0);
  });

  it('should handle files exactly chunk size', async () => {
    const fileSize = 5 * 1024 * 1024; // Exactly 5MB
    const mockFile = new File([new ArrayBuffer(fileSize)], 'exact.bin', { type: 'application/octet-stream' });

    const chunks = await service.splitFileIntoChunks(mockFile);

    expect(chunks.length).toBe(1);
    expect(chunks[0].size).toBe(fileSize);
  });

  it('should adapt chunk size correctly for Petabyte scale', () => {
    const smallFile = 100 * 1024 * 1024; // 100MB
    const largeFile = 100 * 1024 * 1024 * 1024; // 100GB
    const massiveFile = 1000 * 1024 * 1024 * 1024 * 1024; // 1TB (close to PB check)
    const petabyteFile = 1000 * 1000 * 1024 * 1024 * 1024 * 1024; // ~1000TB (actually ~1PB)

    expect(service.getChunkSize(smallFile)).toBe(5 * 1024 * 1024); // 5MB
    expect(service.getChunkSize(largeFile)).toBeGreaterThan(5 * 1024 * 1024);
    expect(service.getChunkSize(massiveFile)).toBeGreaterThan(10 * 1024 * 1024);
    expect(service.getChunkSize(petabyteFile)).toBe(1024 * 1024 * 1024); // 1GB (max)
  });

  it('should create chunk metadata correctly', () => {
    const mockBlob = new Blob([new ArrayBuffer(1024)]);
    const metadata = service.createChunkMetadata(mockBlob, 2, 1024);

    expect(metadata.index).toBe(2);
    expect(metadata.size).toBe(1024);
    expect(metadata.offset).toBe(2 * 5 * 1024 * 1024);
  });
});
