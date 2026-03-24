import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NotificationToastComponent } from './notification-toast.component';
import { NotificationService, ToastNotification } from '../../core/notification.service';
import { Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('NotificationToastComponent', () => {
  let component: NotificationToastComponent;
  let fixture: ComponentFixture<NotificationToastComponent>;
  let notificationServiceMock: any;
  let notificationsSubject: Subject<ToastNotification>;

  beforeEach(async () => {
    notificationsSubject = new Subject();
    notificationServiceMock = {
      notifications$: notificationsSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      imports: [NotificationToastComponent, NoopAnimationsModule],
      providers: [
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add toast when notification is received', () => {
    const toast: ToastNotification = { id: '1', type: 'success', message: 'Success!', timestamp: Date.now() };
    notificationsSubject.next(toast);
    
    expect(component.toasts.length).toBe(1);
    expect(component.toasts[0]).toEqual(toast);
  });

  it('should remove toast when remove is called', () => {
    component.toasts = [{ id: '1', type: 'success', message: 'Success!', timestamp: Date.now() }];
    component.remove('1');
    expect(component.toasts.length).toBe(0);
  });

  it('should auto-remove toast after 5 seconds', async () => {
    vi.useFakeTimers();
    const toast: ToastNotification = { id: '1', type: 'success', message: 'Success!', timestamp: Date.now() };
    notificationsSubject.next(toast);
    
    expect(component.toasts.length).toBe(1);
    
    vi.advanceTimersByTime(5000);
    expect(component.toasts.length).toBe(0);
    vi.useRealTimers();
  });
});
