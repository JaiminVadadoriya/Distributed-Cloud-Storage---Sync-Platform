import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs';
import { DeviceService } from '../../core/services/device.service';
import { BaseComponent } from '../../core/models/base-component';
import { LayoutService } from '../../core/services/layout.service';

interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile';
  lastSyncAt: string;
  status: 'online' | 'offline';
  os: string;
  isCurrent: boolean;
}

/**
 * DevicesComponent manages the enumeration and status tracking 
 * of hardware nodes linked to the identity.
 */
@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './devices.html',
  styleUrl: './devices.css'
})
export class DevicesComponent extends BaseComponent implements OnInit {
  private deviceService = inject(DeviceService);
  private layoutService = inject(LayoutService);
  
  public devices = signal<DeviceInfo[]>([]);

  ngOnInit(): void {
    this.refreshDevices();
  }

  private refreshDevices(): void {
    this.isBusy.set(true);
    this.deviceService.getDevices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const items: DeviceInfo[] = data.map(d => ({
            id: d.id,
            name: d.deviceName,
            type: (['desktop', 'mobile'].includes(d.deviceType.toLowerCase()) ? d.deviceType.toLowerCase() : 'desktop') as 'desktop' | 'mobile',
            lastSyncAt: d.lastSyncAt || d.registeredAt,
            status: d.lastSyncAt && (Date.now() - new Date(d.lastSyncAt).getTime() < 300000) ? 'online' : 'offline',
            os: 'Verified_System',
            isCurrent: false
          }));
          this.devices.set(items);
          this.isBusy.set(false);
        },
        error: () => this.isBusy.set(false)
      });
  }

  public revokeAccess(deviceId: string): void {
    this.layoutService.openConfirm({
      title: 'AUTHORIZE_REVOCATION',
      message: 'Are you sure you want to decouple this node?',
      danger: true,
      action: () => {
        this.deviceService.removeDevice(deviceId)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => this.refreshDevices());
      }
    });
  }

  public forceSync(deviceId: string): void {
    this.deviceService.recordSync(deviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshDevices());
  }

  public getTimeAgo(date: string): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}
