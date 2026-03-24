import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private api = inject(ApiService);

  /** Get all devices registered by the current user. */
  getDevices(): Observable<DeviceDto[]> {
    return this.api.get<ApiResponse<DeviceDto[]>>('/devices').pipe(
      map(r => r.data ?? [])
    );
  }

  /** Register a new device for sync tracking. */
  registerDevice(dto: RegisterDeviceDto): Observable<DeviceDto> {
    return this.api.post<ApiResponse<DeviceDto>>('/devices', dto).pipe(
      map(r => r.data)
    );
  }

  /**
   * Update the last-sync timestamp for a device.
   * Call this after each successful sync cycle.
   */
  recordSync(deviceId: string): Observable<void> {
    return this.api.patch<ApiResponse>(`/devices/${deviceId}/sync`, {}).pipe(
      map(() => void 0)
    );
  }

  /** Remove a registered device. */
  removeDevice(deviceId: string): Observable<void> {
    return this.api.delete<ApiResponse>(`/devices/${deviceId}`).pipe(
      map(() => void 0)
    );
  }
}
