import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConnectionStatusService } from './connection-status.service';

describe('ConnectionStatusService', () => {
  let service: ConnectionStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConnectionStatusService]
    });
    service = TestBed.inject(ConnectionStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should reflect initial online status', () => {
    expect(service.isOnline()).toBe(navigator.onLine);
    expect(service.isOffline()).toBe(!navigator.onLine);
  });

  it('should update status when online event fires', () => {
    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
    expect(service.isOffline()).toBe(false);
  });

  it('should update status when offline event fires', () => {
    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);
    expect(service.isOffline()).toBe(true);
  });
});
