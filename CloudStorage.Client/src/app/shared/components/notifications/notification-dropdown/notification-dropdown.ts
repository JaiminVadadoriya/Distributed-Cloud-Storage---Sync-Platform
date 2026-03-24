import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../../core/models/base-component';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { SignalRService, FileEvent } from '../../../../core/services/signalr.service';
import { takeUntil } from 'rxjs/operators';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityId?: string;
  createdAt: string;
}

@Component({
  selector: 'app-notification-dropdown',
  imports: [CommonModule],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.css',
})
export class NotificationDropdown extends BaseComponent implements OnInit {
  private api = inject(ApiService);
  private signalr = inject(SignalRService);

  notifications = signal<NotificationItem[]>([]);
  isOpen = signal(false);
  unreadCount = signal(0);

  ngOnInit() {
    this.loadNotifications();

    // Listen for real-time file events and convert to notifications
    this.signalr.fileUploaded$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: FileEvent) => {
        const item: NotificationItem = {
          id: `rt_${Date.now()}`,
          type: 'FileUploaded',
          title: 'File Uploaded',
          message: `${event.fileName || 'A file'} was uploaded`,
          isRead: false,
          relatedEntityId: event.fileId,
          createdAt: event.timestamp
        };
        this.notifications.update(list => [item, ...list]);
        this.unreadCount.update(c => c + 1);
      });
  }

  private loadNotifications() {
    this.api.get<ApiResponse<NotificationItem[]>>('/notifications')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = response.data || [];
          this.notifications.set(items);
          this.unreadCount.set(items.filter(n => !n.isRead).length);
        }
      });
  }

  toggle() {
    this.isOpen.update(v => !v);
  }

  markAsRead(id: string) {
    // Skip API call for real-time items (prefixed with rt_)
    if (id.startsWith('rt_')) {
      this.notifications.update(list =>
        list.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      this.unreadCount.update(c => Math.max(0, c - 1));
      return;
    }

    this.api.patch<ApiResponse<void>>(`/notifications/${id}/read`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      });
  }

  markAllAsRead() {
    this.api.post<ApiResponse<void>>('/notifications/read-all', {})
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      });
  }

  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
