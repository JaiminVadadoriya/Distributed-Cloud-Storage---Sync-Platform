import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NotificationToastComponent } from './notification-toast.component';
import { NotificationService } from '../../../core/services/notification.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('NotificationToastComponent', () => {
  let component: NotificationToastComponent;
  let fixture: ComponentFixture<NotificationToastComponent>;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationToastComponent, NoopAnimationsModule],
      providers: [NotificationService]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationToastComponent);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display messages from the notification service', () => {
    notificationService.success('System Online');
    fixture.detectChanges();
    
    expect(component.notificationService.toasts().length).toBe(1);
    expect(component.notificationService.toasts()[0].message).toBe('System Online');
  });

  it('should clear toasts via the service', () => {
    notificationService.info('Temp Message');
    fixture.detectChanges();
    
    const toastId = component.notificationService.toasts()[0].id;
    component.notificationService.removeToast(toastId);
    fixture.detectChanges();
    
    expect(component.notificationService.toasts().length).toBe(0);
  });
});
