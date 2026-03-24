import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NotificationService, ToastNotification } from './notification.service';

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

  it('should emit notification when show is called', () => {
    let received: ToastNotification | undefined;
    service.notifications$.subscribe(n => received = n);

    service.show('Test message', 'success');

    expect(received).toBeDefined();
    expect(received?.message).toBe('Test message');
    expect(received?.type).toBe('success');
    expect(received?.timestamp).toBeDefined();
    expect(received?.id).toBeDefined();
  });

  it('should support short-hand success method', () => {
    let received: ToastNotification | undefined;
    service.notifications$.subscribe(n => received = n);

    service.success('Great!');
    expect(received?.message).toBe('Great!');
    expect(received?.type).toBe('success');
  });

  it('should support short-hand error method', () => {
    let received: ToastNotification | undefined;
    service.notifications$.subscribe(n => received = n);

    service.error('Oops!');
    expect(received?.message).toBe('Oops!');
    expect(received?.type).toBe('error');
  });
});
