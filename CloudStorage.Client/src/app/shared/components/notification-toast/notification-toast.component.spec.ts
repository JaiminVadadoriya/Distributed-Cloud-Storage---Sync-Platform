import { describe, it, expect, beforeEach } from 'vitest';
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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display messages from the notification service', async () => {
    notificationService.success('System Online');
    await fixture.whenStable();
    
    expect(component.notificationService.toasts().length).toBe(1);
    expect(component.notificationService.toasts()[0].message).toBe('System Online');
  });

  it('should clear toasts via the service', async () => {
    notificationService.info('Temp Message');
    await fixture.whenStable();
    
    const toastId = component.notificationService.toasts()[0].id;
    component.notificationService.removeToast(toastId);
    await fixture.whenStable();
    
    expect(component.notificationService.toasts().length).toBe(0);
  });
});
