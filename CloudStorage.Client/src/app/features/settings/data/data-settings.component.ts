import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../../core/services/file.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-data-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <!-- Data Management Header -->
      <section class="space-y-12">
        <header class="pb-4 border-b border-editorial-text/20">
          <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">01. Sector_Wipe_Protocol</h2>
        </header>

        <div class="p-8 border border-editorial-text/10 bg-editorial-text/[0.01] space-y-8">
          <div class="flex items-start gap-8">
            <div class="w-12 h-12 border-2 border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>
            </div>
            <div class="space-y-4">
              <h3 class="text-xl font-sans font-bold uppercase tracking-tight text-editorial-text italic">Emergency_Purge</h3>
              <p class="font-mono text-[11px] uppercase tracking-widest text-editorial-text/40 leading-loose max-w-2xl">
                This action initiates a high-level sector purge. All <span class="text-editorial-text font-bold text-rose-500/80">files</span> and <span class="text-editorial-text font-bold text-rose-500/80">folders</span> owned by this identity will be marked for immediate destruction. 
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
            <div class="space-y-6">
              <label for="confirmationInput" class="block font-mono text-[10px] uppercase tracking-[0.3em] text-editorial-text/60">
                Confirm deletion by typing "CLEAN"
              </label>
              <input 
                id="confirmationInput"
                type="text" 
                [(ngModel)]="confirmationText"
                placeholder="TYPE_CLEAN_HERE"
                class="w-full bg-editorial-text/5 border-b-2 border-editorial-text/10 p-4 font-mono text-sm uppercase tracking-widest text-editorial-text focus:border-editorial-text outline-none transition-all placeholder:text-editorial-text/10"
              />
            </div>

            <div class="flex flex-col justify-end gap-6 text-right">
              <label class="flex items-center justify-end gap-4 cursor-pointer group">
                <span class="font-mono text-[10px] uppercase tracking-[0.3em] text-editorial-text/60 group-hover:text-editorial-text transition-colors">I_APPROVE_DESTRUCTION</span>
                <input 
                  type="checkbox" 
                  [(ngModel)]="isApproved"
                  class="w-5 h-5 border-2 border-editorial-text/20 appearance-none checked:bg-editorial-text transition-all cursor-pointer"
                />
              </label>

              <button 
                (click)="executePurge()"
                [disabled]="!canPurge()"
                [class]="canPurge() 
                  ? 'bg-rose-600 text-white hover:bg-rose-700' 
                  : 'bg-editorial-text/10 text-editorial-text/20 cursor-not-allowed'"
                class="px-12 py-5 font-mono text-xs font-bold uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 group"
              >
                @if (isPurging()) {
                  <span class="animate-pulse">PURGING_SECTORS...</span>
                } @else {
                  <span>EXECUTE_RESET_PROTOCOL</span>
                  <svg class="group-hover:translate-x-2 transition-transform" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                }
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Safety Notes -->
      <section class="p-8 border border-editorial-text/5 bg-editorial-text/[0.005]">
          <div class="flex items-start gap-4">
            <span class="text-rose-500 font-mono text-xs animate-pulse">!</span>
            <p class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/30 leading-relaxed">
              WARNING: Metadata associated with this node will be disconnected. Recovery probability: 0.12%. Proceed only if drive synchronization is complete or if local backups exist.
            </p>
          </div>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }
    input[type="checkbox"]:checked {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
      background-size: 80% 80%;
      background-position: center;
      background-repeat: no-repeat;
    }
  `]
})
export class DataSettingsComponent {
  private fileService = inject(FileService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  confirmationText = '';
  isApproved = false;
  isPurging = signal(false);

  canPurge(): boolean {
    return this.confirmationText.toUpperCase() === 'CLEAN' && this.isApproved && !this.isPurging();
  }

  executePurge() {
    if (!this.canPurge()) return;

    this.isPurging.set(true);
    this.fileService.purgeDrive().subscribe({
      next: () => {
        this.notify.success('DRIVE_RESET: All sectors purged successfully');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      },
      error: () => {
        this.notify.error('PURGE_ERROR: System interlock failed');
        this.isPurging.set(false);
      }
    });
  }
}
