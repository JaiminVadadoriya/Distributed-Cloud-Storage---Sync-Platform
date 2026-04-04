import { Injectable, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { Subject } from 'rxjs';

export interface FileEvent {
  fileId: string;
  fileName?: string;
  size?: number;
  eventType: string;
  timestamp: string;
  ownerId: number;
}

/**
 * SignalRService manages real-time socket connectivity for 
 * instant file system updates across nodes.
 */
@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private authService = inject(AuthService);

  // Event streams for dynamic UI updates
  private readonly fileUploadedSubject = new Subject<FileEvent>();
  public readonly fileUploaded$ = this.fileUploadedSubject.asObservable();

  private readonly fileDeletedSubject = new Subject<FileEvent>();
  public readonly fileDeleted$ = this.fileDeletedSubject.asObservable();

  private readonly allFilesDeletedSubject = new Subject<FileEvent>();
  public readonly allFilesDeleted$ = this.allFilesDeletedSubject.asObservable();

  // Connection state signal
  public readonly isConnected = signal<boolean>(false);

  /**
   * Initializes the socket bridge with the remote cluster.
   */
  public startConnection(): void {
    const token = this.authService.getToken();
    if (!token) return;

    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.start()
      .then(() => {
        this.isConnected.set(true);
        this.registerHandlers();
      })
      .catch(() => {
        this.isConnected.set(false);
      });

    this.hubConnection.onreconnecting(() => this.isConnected.set(false));
    this.hubConnection.onreconnected(() => this.isConnected.set(true));
    this.hubConnection.onclose(() => this.isConnected.set(false));
  }

  /**
   * Gracefully terminates the socket session.
   */
  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().then(() => this.isConnected.set(false));
      this.hubConnection = null;
    }
  }

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('FileEvent', (event: FileEvent) => {
      switch (event.eventType) {
        case 'FileUploaded':
          this.fileUploadedSubject.next(event);
          break;
        case 'FileDeleted':
          this.fileDeletedSubject.next(event);
          break;
        case 'AllFilesDeleted':
          this.allFilesDeletedSubject.next(event);
          break;
      }
    });
  }
}
