import { Injectable, signal, computed, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConnectionStatusService implements OnDestroy {
  private readonly _isOnline = signal(navigator.onLine);
  public readonly isOnline = this._isOnline.asReadonly();
  public readonly isOffline = computed(() => !this._isOnline());

  private onlineHandler = () => this._isOnline.set(true);
  private offlineHandler = () => this._isOnline.set(false);

  constructor() {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }
}
