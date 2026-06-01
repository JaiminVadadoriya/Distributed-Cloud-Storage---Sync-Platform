import { Injectable, signal, computed } from '@angular/core';
import { NotificationItem } from '../models/file.model';

export interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

/**
 * NotificationService manages the global alerting system (toasts + persistent notifications).
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public readonly toasts = signal<ToastNotification[]>([]);

  // Persistent notification center
  private readonly _notifications = signal<NotificationItem[]>([]);
  public readonly notifications = this._notifications.asReadonly();
  public readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

  public success(message: string): void {
    this.addToast(message, 'success');
    this.addNotification(message, 'success');
  }

  public error(message: string): void {
    this.addToast(message, 'error');
    this.addNotification(message, 'error');
  }

  public info(message: string): void {
    this.addToast(message, 'info');
    this.addNotification(message, 'info');
  }

  public warning(message: string): void {
    this.addToast(message, 'warning');
    this.addNotification(message, 'warning');
  }

  private addToast(message: string, type: ToastNotification['type']): void {
    const id = Date.now();
    this.toasts.update(current => [...current, { id, message, type }]);
    setTimeout(() => this.removeToast(id), 5000);
  }

  public removeToast(id: number): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  private addNotification(message: string, type: NotificationItem['type']): void {
    const item: NotificationItem = {
      id: crypto.randomUUID(),
      title: type.toUpperCase(),
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    this._notifications.update(current => [item, ...current].slice(0, 50));
  }

  public markAsRead(id: string): void {
    this._notifications.update(items =>
      items.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  public markAllAsRead(): void {
    this._notifications.update(items =>
      items.map(n => ({ ...n, read: true }))
    );
  }

  public clearAll(): void {
    this._notifications.set([]);
  }

  public removeNotification(id: string): void {
    this._notifications.update(items => items.filter(n => n.id !== id));
  }
}

