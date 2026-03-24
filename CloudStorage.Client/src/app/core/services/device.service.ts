import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { Observable, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { BaseService } from '../models/base-service';

export interface DeviceDto {
  id: string;
  deviceName: string;
  deviceType: string;
  lastSyncAt: string | null;
  registeredAt: string;
}

export interface RegisterDeviceDto {
  deviceName: string;
  deviceType: string;
}

/**
 * DeviceService manages hardware registration and sync tracking.
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceService extends BaseService {
  private api = inject(ApiService);

  /** Get all devices registered by the current user. */
  public getDevices(): Observable<DeviceDto[]> {
    return this.withLoading(
      this.api.get<ApiResponse<DeviceDto[]>>('/devices').pipe(
        map(r => r.data ?? []),
        catchError(this.handleError<DeviceDto[]>('GET_DEVICES', []))
      )
    );
  }

  /** Register a new device for sync tracking. */
  public registerDevice(dto: RegisterDeviceDto): Observable<DeviceDto> {
    return this.api.post<ApiResponse<DeviceDto>>('/devices', dto).pipe(
      map(r => r.data),
      catchError(this.handleError<DeviceDto>('REGISTER_DEVICE'))
    );
  }

  /**
   * Update the last-sync timestamp for a device.
   */
  public recordSync(deviceId: string): Observable<void> {
    return this.api.patch<ApiResponse<void>>(`/devices/${deviceId}/sync`, {}).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('RECORD_SYNC'))
    );
  }

  /** Remove a registered device. */
  public removeDevice(deviceId: string): Observable<void> {
    return this.api.delete<ApiResponse<void>>(`/devices/${deviceId}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('REMOVE_DEVICE'))
    );
  }
}
