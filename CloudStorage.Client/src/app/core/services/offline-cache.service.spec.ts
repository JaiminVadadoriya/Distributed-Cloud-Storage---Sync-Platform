import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OfflineCacheService } from './offline-cache.service';

describe('OfflineCacheService', () => {
  let service: OfflineCacheService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    (localStorage.getItem as any).mockClear();
    (localStorage.setItem as any).mockClear();
    (localStorage.removeItem as any).mockClear();

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

    (localStorage.getItem as any).mockReturnValue(timestamp);
    expect(service.getLastSyncTimestamp()).toBe(timestamp);
  });

  it('should return null if no sync timestamp is stored', () => {
    (localStorage.getItem as any).mockReturnValue(null);
    expect(service.getLastSyncTimestamp()).toBeNull();
  });
});
