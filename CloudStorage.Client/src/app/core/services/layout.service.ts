import { Injectable, signal, inject, effect } from '@angular/core';
import { Subject } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
}

export interface ConfirmConfig {
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  action: () => void | Promise<void> | import('rxjs').Observable<void>;
}

export interface PromptConfig {
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  action: (value: string) => void;
}

/**
 * LayoutService manages the responsive state of the application shell.
 * Standardized with Signals for zero-overhead reactivity.
 */
@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  // Responsive state
  public readonly isMobile = toSignal(
    this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );

  private readonly _isSidebarOpen = signal<boolean>(false);
  public readonly isSidebarOpen = this._isSidebarOpen.asReadonly();

  private readonly _isUploadModalOpen = signal<boolean>(false);
  public readonly isUploadModalOpen = this._isUploadModalOpen.asReadonly();

  private readonly _isFileDetailsPanelOpen = signal<boolean>(false);
  public readonly isFileDetailsPanelOpen = this._isFileDetailsPanelOpen.asReadonly();

  private readonly _uploadTrigger = new Subject<void>();
  public readonly uploadTrigger$ = this._uploadTrigger.asObservable();

  private readonly _newFolderTrigger = new Subject<void>();
  public readonly newFolderTrigger$ = this._newFolderTrigger.asObservable();

  public triggerGlobalUpload(): void {
    this._uploadTrigger.next();
    this.openUploadModal();
  }

  public triggerNewFolder(): void {
    this._newFolderTrigger.next();
  }

  private readonly _selectedFileId = signal<string | null>(null);
  public readonly selectedFileId = this._selectedFileId.asReadonly();

  private readonly _isNotificationDropdownOpen = signal<boolean>(false);
  public readonly isNotificationDropdownOpen = this._isNotificationDropdownOpen.asReadonly();

  private readonly _isProfileMenuOpen = signal<boolean>(false);
  public readonly isProfileMenuOpen = this._isProfileMenuOpen.asReadonly();

  private readonly _isSyncPanelOpen = signal<boolean>(false);
  public readonly isSyncPanelOpen = this._isSyncPanelOpen.asReadonly();

  private readonly _isContextMenuOpen = signal<boolean>(false);
  public readonly isContextMenuOpen = this._isContextMenuOpen.asReadonly();

  private readonly _contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  public readonly contextMenuPosition = this._contextMenuPosition.asReadonly();

  private readonly _contextMenuItems = signal<ContextMenuItem[]>([]);
  public readonly contextMenuItems = this._contextMenuItems.asReadonly();

  private readonly _confirmModal = signal<(ConfirmConfig & { isOpen: boolean }) | null>(null);
  public readonly confirmModal = this._confirmModal.asReadonly();

  private readonly _promptModal = signal<(PromptConfig & { isOpen: boolean }) | null>(null);
  public readonly promptModal = this._promptModal.asReadonly();


  constructor() {
    // Automatically close sidebar when switching to desktop if it was open as a drawer
    effect(() => {
      if (!this.isMobile()) {
        this._isSidebarOpen.set(true); // Default open on desktop
      } else {
        this._isSidebarOpen.set(false); // Default closed on mobile
      }
    });

  }

  public toggleSidebar(): void {
    this._isSidebarOpen.update(v => !v);
  }

  public openSidebar(): void {
    this._isSidebarOpen.set(true);
  }

  public closeSidebar(): void {
    this._isSidebarOpen.set(false);
  }

  public openUploadModal(): void {
    this._isUploadModalOpen.set(true);
  }

  public closeUploadModal(): void {
    this._isUploadModalOpen.set(false);
  }

  public openFileDetails(fileId: string): void {
    this._selectedFileId.set(fileId);
    this._isFileDetailsPanelOpen.set(true);
  }

  public closeFileDetails(): void {
    this._isFileDetailsPanelOpen.set(false);
    this._selectedFileId.set(null);
  }

  public toggleNotificationDropdown(): void {
    this._isNotificationDropdownOpen.update(v => !v);
    if (this._isNotificationDropdownOpen()) {
      this._isProfileMenuOpen.set(false);
      if (this.isMobile()) this.closeSidebar();
    }
  }

  public closeNotificationDropdown(): void {
    this._isNotificationDropdownOpen.set(false);
  }

  public toggleProfileMenu(): void {
    this._isProfileMenuOpen.update(v => !v);
    if (this._isProfileMenuOpen()) {
      this._isNotificationDropdownOpen.set(false);
      if (this.isMobile()) this.closeSidebar();
    }
  }

  public closeProfileMenu(): void {
    this._isProfileMenuOpen.set(false);
  }

  public toggleSyncPanel(): void {
    this._isSyncPanelOpen.update(v => !v);
  }

  public closeSyncPanel(): void {
    this._isSyncPanelOpen.set(false);
  }

  public openContextMenu(x: number, y: number, items: ContextMenuItem[]): void {
    this._contextMenuPosition.set({ x, y });
    this._contextMenuItems.set(items);
    this._isContextMenuOpen.set(true);
  }

  public closeContextMenu(): void {
    this._isContextMenuOpen.set(false);
    this._contextMenuItems.set([]);
  }

  public closeAllOverlays(): void {
    this._isNotificationDropdownOpen.set(false);
    this._isProfileMenuOpen.set(false);
    this._isContextMenuOpen.set(false);
    this._confirmModal.set(null);
    this._promptModal.set(null);
    if (this.isMobile()) this.closeSidebar();
  }

  public openConfirm(config: ConfirmConfig): void {
    this._confirmModal.set({ ...config, isOpen: true });
  }

  public closeConfirm(): void {
    this._confirmModal.set(null);
  }

  public openPrompt(config: PromptConfig): void {
    this._promptModal.set({ ...config, isOpen: true });
  }

  public closePrompt(): void {
    this._promptModal.set(null);
  }

}


