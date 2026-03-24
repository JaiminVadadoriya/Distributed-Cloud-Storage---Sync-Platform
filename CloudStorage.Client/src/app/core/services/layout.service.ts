import { Injectable, signal, computed } from '@angular/core';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

/**
 * LayoutService manages the responsive state of the application shell.
 * Standardized with Signals for zero-overhead reactivity.
 */
@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private readonly _isSidebarOpen = signal<boolean>(false);
  public readonly isSidebarOpen = this._isSidebarOpen.asReadonly();

  private readonly _isUploadModalOpen = signal<boolean>(false);
  public readonly isUploadModalOpen = this._isUploadModalOpen.asReadonly();

  private readonly _isFileDetailsPanelOpen = signal<boolean>(false);
  public readonly isFileDetailsPanelOpen = this._isFileDetailsPanelOpen.asReadonly();

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

  public toggleSidebar(): void {
    this._isSidebarOpen.update(v => !v);
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
    }
  }

  public closeNotificationDropdown(): void {
    this._isNotificationDropdownOpen.set(false);
  }

  public toggleProfileMenu(): void {
    this._isProfileMenuOpen.update(v => !v);
    if (this._isProfileMenuOpen()) {
      this._isNotificationDropdownOpen.set(false);
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
  }
}

