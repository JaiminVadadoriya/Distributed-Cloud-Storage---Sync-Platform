import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { TrashService } from '../../../core/services/trash.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LayoutService } from '../../../core/services/layout.service';
import { TrashItem } from '../../../core/models/file.model';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ErrorBoundaryComponent } from '../../../shared/components/error-boundary/error-boundary.component';
import { takeUntil } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-trash',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent, ErrorBoundaryComponent],
  template: `
    <div class="space-y-12 animate-in-fade">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-8 pb-8 border-b border-editorial-border">
        <div class="space-y-3">
          <h1 class="text-4xl lg:text-6xl font-extrabold font-sans tracking-tighter text-editorial-text uppercase leading-none">Recycle_Bin</h1>
          <div class="flex items-center gap-4">
            <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Auto-purge cycle: 30 days</p>
            <div class="h-px w-8 bg-editorial-border/30"></div>
            <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Status: {{ trashItems().length > 0 ? 'OCCUPIED' : 'CLEAR' }}</p>
          </div>
        </div>
        <button id="purge-all-btn" (click)="onEmptyTrash()" [disabled]="isActionBusy()"
          class="px-8 py-4 border-2 border-rose-500 text-rose-500 font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-rose-500 hover:text-white active:scale-95 transition-all disabled:opacity-30 shadow-brutalist hover:shadow-none">
          {{ isActionBusy() ? 'Executing_Protocol...' : 'GLOBAL_PURGE_ALL' }}
        </button>
      </div>

      @if (isBusy() && trashItems().length === 0) {
        <app-skeleton-loader variant="table" [count]="6"></app-skeleton-loader>
      } @else if (errorMessage()) {
        <app-error-boundary [message]="errorMessage()!" (retryClicked)="loadTrash()"></app-error-boundary>
      } @else if (trashItems().length === 0) {
        <div class="py-24 text-center space-y-8 bg-editorial-text/[0.01] border border-editorial-border/50">
          <div class="w-20 h-20 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/10 text-4xl font-mono">&empty;</div>
          <div class="space-y-2">
            <h3 class="text-xl font-extrabold uppercase tracking-tight text-editorial-text/40">Bin_Status: VACANT</h3>
            <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/20">Protocol_Status: STANDBY</p>
          </div>
        </div>
      } @else {
        <div class="border border-editorial-border bg-editorial-bg shadow-sm" [class.opacity-50]="isBusy()">
          <!-- Table Header -->
          <div class="grid grid-cols-[60px_1fr_120px_250px] gap-6 px-8 py-4 bg-editorial-text/[0.02] border-b border-editorial-border">
            <div class="text-[9px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 font-bold">TYPE</div>
            <div class="text-[9px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 font-bold">IDENTIFIER</div>
            <div class="text-[9px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 font-bold">DELETED</div>
            <div class="text-[9px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 font-bold text-right">PROTOCOL</div>
          </div>

          <div class="divide-y divide-editorial-border/30">
            @for (item of trashItems(); track item.id) {
              <div [id]="'trash-' + item.id" 
                   attr.data-testid="trash-row-{{item.id}}"
                   class="grid grid-cols-[60px_1fr_120px_250px] gap-6 px-8 py-5 items-center hover:bg-editorial-text/[0.01] group transition-colors">
                
                <div class="flex items-center justify-start opacity-30 group-hover:opacity-100 transition-opacity">
                  @switch (getFileCategory(item)) {
                    @case ('image') { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }
                    @case ('video') { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg> }
                    @case ('code') { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> }
                    @case ('document') { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> }
                    @default { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
                  }
                </div>

                <div class="flex flex-col min-w-0">
                  <span class="text-[13px] font-extrabold uppercase tracking-tight text-editorial-text truncate">{{ item.name }}</span>
                  <span class="text-[8px] font-mono uppercase tracking-widest text-editorial-text/30">ID: {{ item.id.substring(0, 8).toUpperCase() }}</span>
                </div>

                <div class="text-[10px] font-mono uppercase tracking-widest text-editorial-text/40">
                  {{ item.deletedAt | date:'dd.MM.yy' }}
                </div>

                <div class="flex items-center gap-3 justify-end opacity-20 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button [id]="'restore-btn-' + item.id" (click)="onRestore(item.id)" [disabled]="isBusy()"
                          attr.data-testid="restore-btn-{{item.id}}"
                          class="px-5 py-2 border border-editorial-text/20 text-[9px] font-mono uppercase tracking-widest hover:bg-editorial-text hover:text-editorial-bg transition-all disabled:opacity-30 active:scale-95">
                    Restore
                  </button>
                  <button [id]="'destroy-btn-' + item.id" (click)="onPermanentDelete(item.id)" [disabled]="isBusy()"
                          attr.data-testid="destroy-btn-{{item.id}}"
                          class="px-5 py-2 border border-rose-500/20 text-rose-500 text-[9px] font-mono uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 active:scale-95">
                    Destroy
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class TrashComponent extends BaseComponent implements OnInit {
  private trashService = inject(TrashService);
  private notify = inject(NotificationService);
  private layoutService = inject(LayoutService);

  trashItems = signal<TrashItem[]>([]);
  isActionBusy = signal(false);

  ngOnInit(): void {
    this.loadTrash();
  }

  loadTrash(): void {
    this.isBusy.set(true);
    this.errorMessage.set(null);
    this.trashService.getTrashItems().pipe(takeUntil(this.destroy$)).subscribe({
      next: items => { 
        this.trashItems.set(items); 
        this.isBusy.set(false); 
      },
      error: (err) => { 
        this.errorMessage.set(err.message || 'Failed to initialize trash collection.'); 
        this.isBusy.set(false); 
      }
    });
  }

  async onRestore(id: string): Promise<void> {
    console.log('Attempting Restore for ID:', id);
    await this.safeExecute(async () => {
      await lastValueFrom(this.trashService.restoreFile(id));
      this.notify.success('RESTORE_SUCCESS: Entity normalized.');
      this.loadTrash();
    });
  }

  onPermanentDelete(id: string): void {
    this.layoutService.openConfirm({
      title: 'CRITICAL_PURGE',
      message: 'Are you sure you want to permanently delete this entity? This operation is irreversible.',
      danger: true,
      action: () => this.safeExecute(async () => {
        await lastValueFrom(this.trashService.permanentDelete(id));
        this.notify.success('PURGE_COMPLETE: Trace effectively eliminated.');
        this.loadTrash();
      })
    });
  }

  onEmptyTrash(): void {
    this.layoutService.openConfirm({
      title: 'GLOBAL_PURGE_PROTOCOL',
      message: 'Empty recycle bin? ALL deleted entities will be permanently erased.',
      danger: true,
      action: () => this.safeExecute(async () => {
        this.isActionBusy.set(true);
        try {
          await lastValueFrom(this.trashService.emptyTrash());
          this.notify.success('GLOBAL_PURGE_SUCCESS');
          this.trashItems.set([]);
        } finally {
          this.isActionBusy.set(false);
        }
      })
    });
  }

  getFileCategory(item: TrashItem): string {
    const ext = item.type?.toLowerCase() || item.name?.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
    if (['ts', 'js', 'html', 'css', 'py', 'json', 'md'].includes(ext)) return 'code';
    if (['doc', 'docx', 'pdf', 'txt'].includes(ext)) return 'document';
    return 'unknown';
  }
}
