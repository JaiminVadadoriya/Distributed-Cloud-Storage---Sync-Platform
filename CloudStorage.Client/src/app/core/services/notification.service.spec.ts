import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit notification when a toast is added', () => {
    service.success('Test message');
    const toasts = service.toasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Test message');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].id).toBeDefined();
  });

  it('should support short-hand success method', () => {
    service.success('Great!');
    const toasts = service.toasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Great!');
    expect(toasts[0].type).toBe('success');
  });

  it('should support short-hand error method', () => {
    service.error('Oops!');
    const toasts = service.toasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Oops!');
    expect(toasts[0].type).toBe('error');
  });

  it('should support short-hand info method', () => {
    service.info('FYI');
    const toasts = service.toasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('FYI');
    expect(toasts[0].type).toBe('info');
  });

  it('should support short-hand warning method', () => {
    service.warning('Watch out!');
    const toasts = service.toasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Watch out!');
    expect(toasts[0].type).toBe('warning');
  });

  it('should remove toast after timeout', () => {
    vi.useFakeTimers();
    service.success('Timeout test');
    expect(service.toasts().length).toBe(1);
    
    vi.advanceTimersByTime(5000);
    
    expect(service.toasts().length).toBe(0);
    vi.useRealTimers();
  });

  it('should allow manual removal of toast', () => {
    service.success('Manual remove');
    const id = service.toasts()[0].id;
    
    service.removeToast(id);
    
    expect(service.toasts().length).toBe(0);
  });
});
