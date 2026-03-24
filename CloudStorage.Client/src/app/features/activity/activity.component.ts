import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService, ActivityLog } from '../../core/services/activity.service';
import { BaseComponent } from '../../core/models/base-component';

/**
 * ActivityComponent provides a system-wide audit log of 
 * file operations and sync events.
 */
@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity.html',
  styleUrl: './activity.css'
})
export class ActivityComponent extends BaseComponent implements OnInit {
  private activityService = inject(ActivityService);
  public activities = signal<ActivityLog[]>([]);

  ngOnInit(): void {
    // SYSTEM_REQUEST: Enumerate recent activity segments
    this.activityService.getRecentActivity().subscribe(data => {
      this.activities.set(data);
    });
  }
}
