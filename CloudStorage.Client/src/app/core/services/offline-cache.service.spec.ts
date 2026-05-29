import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OfflineCacheService } from './offline-cache.service';

describe('OfflineCacheService', () => {
  let service: OfflineCacheService;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    TestBed.configureTestingModule({
      providers: [OfflineCacheService]
    });
    service = TestBed.inject(OfflineCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve last sync timestamp', () => {
    const timestamp = new Date().toISOString();
    service.setLastSyncTimestamp(timestamp);
    expect(localStorage.setItem).toHaveBeenCalledWith('lastSyncTimestamp', timestamp);

    vi.mocked(localStorage.getItem).mockReturnValue(timestamp);
    expect(service.getLastSyncTimestamp()).toBe(timestamp);
  });

  it('should return null if no sync timestamp is stored', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    expect(service.getLastSyncTimestamp()).toBeNull();
  });
});
