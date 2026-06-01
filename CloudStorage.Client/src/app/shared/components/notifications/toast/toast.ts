import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  private notificationService = inject(NotificationService);
  toasts = this.notificationService.toasts;

  dismiss(id: number) {
    this.notificationService.removeToast(id);
  }
}
