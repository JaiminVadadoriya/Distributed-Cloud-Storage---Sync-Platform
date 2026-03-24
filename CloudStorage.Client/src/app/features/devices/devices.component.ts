import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../core/services/device.service';
import { BaseComponent } from '../../core/models/base-component';

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
  public devices = signal<any[]>([]);

  ngOnInit(): void {
    this.deviceService.getDevices().subscribe((data: any[]) => {
      this.devices.set(data);
    });
  }
}
