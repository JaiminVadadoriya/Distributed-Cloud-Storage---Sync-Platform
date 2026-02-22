import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Subject, Observable } from 'rxjs';

export interface FileEvent {
  fileId: string;
  fileName?: string;
  size?: number;
  eventType: string;
  timestamp: string;
  ownerId: number;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private authService = inject(AuthService);

  private fileUploadedSubject = new Subject<FileEvent>();
  public fileUploaded$ = this.fileUploadedSubject.asObservable();

  private fileDeletedSubject = new Subject<FileEvent>();
  public fileDeleted$ = this.fileDeletedSubject.asObservable();

  private allFilesDeletedSubject = new Subject<FileEvent>();
  public allFilesDeleted$ = this.allFilesDeletedSubject.asObservable();

  private connectionEstablishedSubject = new Subject<boolean>();
  public connectionEstablished$ = this.connectionEstablishedSubject.asObservable();

  public startConnection(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('Cannot start SignalR connection without an access token.');
      return;
    }

    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Exponential backoff
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR Hub connection started successfully.');
        this.connectionEstablishedSubject.next(true);
        this.registerHandlers();
      })
      .catch((err) => {
        console.error('Error while starting connection: ' + err);
        this.connectionEstablishedSubject.next(false);
      });

    this.hubConnection.onreconnecting((error) => {
      console.warn(`SignalR reconnecting... Error: ${error}`);
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log(`SignalR reconnected. Connection ID: ${connectionId}`);
      this.connectionEstablishedSubject.next(true);
    });

    this.hubConnection.onclose((error) => {
      console.warn(`SignalR connection closed. Error: ${error}`);
      this.connectionEstablishedSubject.next(false);
    });
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().then(() => {
        console.log('SignalR Hub connection stopped.');
        this.connectionEstablishedSubject.next(false);
      });
      this.hubConnection = null;
    }
  }

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('FileEvent', (event: FileEvent) => {
      console.log('Received FileEvent:', event);
      if (event.eventType === 'FileUploaded') {
        this.fileUploadedSubject.next(event);
      } else if (event.eventType === 'FileDeleted') {
        this.fileDeletedSubject.next(event);
      } else if (event.eventType === 'AllFilesDeleted') {
        this.allFilesDeletedSubject.next(event);
      }
    });
  }
}
