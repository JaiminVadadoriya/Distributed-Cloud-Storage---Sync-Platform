import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { TrashService } from '../../../core/services/trash.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TrashItem } from '../../../core/models/file.model';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ErrorBoundaryComponent } from '../../../shared/components/error-boundary/error-boundary.component';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-trash',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent, ErrorBoundaryComponent],
  template: `
    <div class="space-y-12">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-editorial-text/20">
        <div class="space-y-2">
          <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">Recycle_Bin</h1>
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60">Items auto-purge after 30 cycles</p>
        </div>
        @if (trashItems().length > 0) {
          <button (click)="onEmptyTrash()" [disabled]="isBusy()"
            class="px-6 py-3 bg-rose-600 text-white font-mono text-[9px] uppercase tracking-[0.2em] font-bold hover:bg-rose-700 active:scale-[0.98] transition-all disabled:opacity-50">
            Purge_All_Items
          </button>
        }
      </div>

      @if (isBusy() && trashItems().length === 0) {
        <app-skeleton-loader variant="table" [count]="6"></app-skeleton-loader>
      } @else if (errorMessage()) {
        <app-error-boundary [message]="errorMessage()!" (retryClicked)="loadTrash()"></app-error-boundary>
      } @else if (trashItems().length === 0) {
        <div class="py-20 text-center space-y-4">
          <div class="w-16 h-16 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-3xl font-mono">&empty;</div>
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Bin_Status: EMPTY</p>
        </div>
      } @else {
        <div class="border border-editorial-text/20 divide-y divide-editorial-text/10">
          <!-- Table Header -->
          <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-editorial-text/[0.02]">
            <div class="col-span-5 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">File_Name</div>
            <div class="col-span-2 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Type</div>
            <div class="col-span-2 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Deleted</div>
            <div class="col-span-3 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50 text-right">Actions</div>
          </div>

          @for (item of trashItems(); track item.id) {
            <div class="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-editorial-text/[0.02] group transition-none">
              <div class="col-span-5 text-[11px] font-mono text-editorial-text truncate">{{ item.name }}</div>
              <div class="col-span-2 text-[9px] font-mono uppercase tracking-wider text-editorial-text/50">{{ item.type }}</div>
              <div class="col-span-2 text-[9px] font-mono text-editorial-text/50">{{ item.deletedAt | date:'short' }}</div>
              <div class="col-span-3 flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button (click)="onRestore(item.id)" class="px-4 py-1.5 border border-editorial-text/20 text-[8px] font-mono uppercase tracking-widest hover:bg-editorial-text hover:text-editorial-bg transition-none">
                  Restore
                </button>
                <button (click)="onPermanentDelete(item.id)" class="px-4 py-1.5 border border-rose-500/20 text-rose-500 text-[8px] font-mono uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-none">
                  Destroy
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class TrashComponent extends BaseComponent implements OnInit {
  private trashService = inject(TrashService);
  private notify = inject(NotificationService);

  trashItems = signal<TrashItem[]>([]);

  ngOnInit(): void {
    this.loadTrash();
  }

  loadTrash(): void {
    this.isBusy.set(true);
    this.errorMessage.set(null);
    this.trashService.getTrashItems().pipe(takeUntil(this.destroy$)).subscribe({
      next: items => { this.trashItems.set(items); this.isBusy.set(false); },
      error: (err) => { this.errorMessage.set(err.message); this.isBusy.set(false); }
    });
  }

  onRestore(id: string): void {
    this.trashService.restoreFile(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.notify.success('File restored'); this.loadTrash(); }
    });
  }

  onPermanentDelete(id: string): void {
    this.trashService.permanentDelete(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.notify.success('File permanently deleted'); this.loadTrash(); }
    });
  }

  onEmptyTrash(): void {
    this.trashService.emptyTrash().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.notify.success('Trash emptied'); this.trashItems.set([]); }
    });
  }
}
