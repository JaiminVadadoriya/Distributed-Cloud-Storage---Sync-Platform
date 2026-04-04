import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { TrashService } from '../../../core/services/trash.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TrashItem } from '../../../core/models/file.model';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ErrorBoundaryComponent } from '../../../shared/components/error-boundary/error-boundary.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { takeUntil } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-trash',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent, ErrorBoundaryComponent, ConfirmModalComponent],
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
            {{ isBusy() ? 'Executing_Protocol...' : 'Purge_All_Items' }}
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
        <div class="border border-editorial-text/20 divide-y divide-editorial-text/10" [class.opacity-50]="isBusy()">
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
              <div class="col-span-3 flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button (click)="onRestore(item.id)" [disabled]="isBusy()"
                        class="px-4 py-1.5 border border-editorial-text/20 text-[8px] font-mono uppercase tracking-widest hover:bg-editorial-text hover:text-editorial-bg transition-none disabled:opacity-30">
                  Restore
                </button>
                <button (click)="onPermanentDelete(item.id)" [disabled]="isBusy()"
                        class="px-4 py-1.5 border border-rose-500/20 text-rose-500 text-[8px] font-mono uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-none disabled:opacity-30">
                  Destroy
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Confirmation Modals -->
      <app-confirm-modal 
        [isOpen]="confirmState().isOpen" 
        [title]="confirmState().title" 
        [message]="confirmState().message"
        [danger]="confirmState().danger" 
        (confirmed)="onConfirmExecution()" 
        (cancelled)="closeConfirmModal()">
      </app-confirm-modal>
    </div>
  `
})
export class TrashComponent extends BaseComponent implements OnInit {
  private trashService = inject(TrashService);
  private notify = inject(NotificationService);

  trashItems = signal<TrashItem[]>([]);
  
  confirmState = signal({
    isOpen: false,
    title: '',
    message: '',
    danger: false,
    action: null as (() => Promise<void>) | null
  });

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
    this.confirmState.set({
      isOpen: true,
      title: 'CRITICAL_PURGE',
      message: 'Are you sure you want to permanently delete this entity? This operation is irreversible.',
      danger: true,
      action: async () => {
        await lastValueFrom(this.trashService.permanentDelete(id));
        this.notify.success('PURGE_COMPLETE: Trace effectively eliminated.');
        this.loadTrash();
      }
    });
  }

  onEmptyTrash(): void {
    this.confirmState.set({
      isOpen: true,
      title: 'GLOBAL_PURGE_PROTOCOL',
      message: 'Empty recycle bin? ALL deleted entities will be permanently erased.',
      danger: true,
      action: async () => {
        await lastValueFrom(this.trashService.emptyTrash());
        this.notify.success('GLOBAL_PURGE_SUCCESS');
        this.trashItems.set([]);
      }
    });
  }

  async onConfirmExecution() {
    const state = this.confirmState();
    if (state.action) {
      this.closeConfirmModal();
      await this.safeExecute(state.action);
    }
  }

  closeConfirmModal() {
    this.confirmState.update(s => ({ ...s, isOpen: false }));
  }
}
