import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { ActivityService } from '../../core/services/activity.service';
import { BaseComponent } from '../../core/models/base-component';
import { AuditEntry } from '../../core/models/file.model';

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
  
  public activities = signal<AuditEntry[]>([]);
  public filterType = signal<string>('all');

  public groupedActivities = computed(() => {
    const groups: { date: string, entries: AuditEntry[] }[] = [];
    const sorted = [...this.activities()].sort((a,b) => 
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );

    sorted.forEach(entry => {
      const date = new Date(entry.performedAt).toDateString();
      let group = groups.find(g => g.date === date);
      if (!group) {
        group = { date, entries: [] };
        groups.push(group);
      }
      group.entries.push(entry);
    });

    return groups;
  });

  ngOnInit(): void {
    this.loadActivity();
  }

  public onFilterChange(type: string): void {
    this.filterType.set(type);
    this.loadActivity();
  }

  private loadActivity(): void {
    this.isBusy.set(true);
    this.activityService.getRecentActivity(this.filterType())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: AuditEntry[]) => {
          this.activities.set(data);
          this.isBusy.set(false);
        },
        error: () => this.isBusy.set(false)
      });
  }

  public formatTime(date: string): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  public getActionLabel(action: string): string {
    switch(action.toLowerCase()) {
      case 'upload': return 'Injected';
      case 'delete': return 'Purged';
      case 'share': return 'Distributed';
      case 'move': return 'Relocated';
      case 'rename': return 'Reconfigured';
      default: return action;
    }
  }
}
