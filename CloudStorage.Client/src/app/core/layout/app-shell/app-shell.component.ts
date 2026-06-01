import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { LayoutService } from '../../services/layout.service';
import { BaseComponent } from '../../models/base-component';
import { OfflineBanner } from '../../../shared/components/offline-banner/offline-banner';
import { NotificationToastComponent } from '../../../shared/components/notification-toast/notification-toast.component';
import { ContextMenuComponent } from '../../../shared/components/context-menu/context-menu.component';
import { SyncStatus } from '../../../shared/components/sync-status/sync-status';
import { UploadModalComponent } from '../../../shared/components/modal/upload-modal.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { PromptModalComponent } from '../../../shared/components/modal/prompt-modal.component';
import { FileUploadComponent, FileUploadEvent } from '../../../shared/components/file-upload/file-upload.component';
import { UploadManagerService } from '../../services/upload-manager.service';
import { SignalRService } from '../../services/signalr.service';
import { CommandPaletteComponent } from '../../../shared/components/command-palette/command-palette.component';
import { UndoRedoService } from '../../services/undo-redo.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, OfflineBanner, NotificationToastComponent, ContextMenuComponent, SyncStatus, UploadModalComponent, ConfirmModalComponent, PromptModalComponent, FileUploadComponent, CommandPaletteComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css'
})
export class AppShellComponent extends BaseComponent implements OnInit {
  public layoutService = inject(LayoutService);
  private uploadManager = inject(UploadManagerService);
  private signalRService = inject(SignalRService);
  private undoRedoService = inject(UndoRedoService);

  ngOnInit() {
    this.signalRService.startConnection();
  }

  override ngOnDestroy() {
    this.signalRService.stopConnection();
    super.ngOnDestroy();
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent) {
    const isCtrl = event.ctrlKey || event.metaKey;
    if (isCtrl && event.key === 'z') {
      event.preventDefault();
      this.undoRedoService.undo();
    } else if (isCtrl && event.key === 'y') {
      event.preventDefault();
      this.undoRedoService.redo();
    }
  }

  onGlobalFilesSelected(events: FileUploadEvent[]) {
    events.filter(e => e.valid).forEach(e => {
      this.uploadManager.addToQueue(e.file);
    });
  }
}


