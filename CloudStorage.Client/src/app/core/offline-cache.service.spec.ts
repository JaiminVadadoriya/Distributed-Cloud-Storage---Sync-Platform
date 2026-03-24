import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OfflineCacheService } from './offline-cache.service';

describe('OfflineCacheService', () => {
  let service: OfflineCacheService;

  beforeEach(() => {
    // Mock IndexedDB if needed, but here we'll test localStorage logic first
    // and basic service instantiation.
    // For full IndexedDB testing, a more complex mock is required.
    
    TestBed.configureTestingModule({
      providers: [OfflineCacheService]
    });
    service = TestBed.inject(OfflineCacheService);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve last sync timestamp', () => {
    const timestamp = new Date().toISOString();
    service.setLastSyncTimestamp(timestamp);
    expect(service.getLastSyncTimestamp()).toBe(timestamp);
    expect(localStorage.getItem('lastSyncTimestamp')).toBe(timestamp);
  });

  it('should return null if no sync timestamp is stored', () => {
    expect(service.getLastSyncTimestamp()).toBeNull();
  });
});
