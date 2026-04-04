import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  let service: LayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LayoutService]
    });
    service = TestBed.inject(LayoutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should toggle sidebar state', () => {
    expect(service.isSidebarOpen()).toBe(false);
    service.toggleSidebar();
    expect(service.isSidebarOpen()).toBe(true);
    service.toggleSidebar();
    expect(service.isSidebarOpen()).toBe(false);
  });

  it('should open and close upload modal', () => {
    expect(service.isUploadModalOpen()).toBe(false);
    service.openUploadModal();
    expect(service.isUploadModalOpen()).toBe(true);
    service.closeUploadModal();
    expect(service.isUploadModalOpen()).toBe(false);
  });

  it('should open and close file details', () => {
    expect(service.isFileDetailsPanelOpen()).toBe(false);
    expect(service.selectedFileId()).toBeNull();
    
    service.openFileDetails('f1');
    expect(service.isFileDetailsPanelOpen()).toBe(true);
    expect(service.selectedFileId()).toBe('f1');
    
    service.closeFileDetails();
    expect(service.isFileDetailsPanelOpen()).toBe(false);
    expect(service.selectedFileId()).toBeNull();
  });

  it('should toggle notification dropdown and close profile menu', () => {
    service.toggleProfileMenu();
    expect(service.isProfileMenuOpen()).toBe(true);
    
    service.toggleNotificationDropdown();
    expect(service.isNotificationDropdownOpen()).toBe(true);
    expect(service.isProfileMenuOpen()).toBe(false);
  });

  it('should open and close context menu', () => {
    const items = [{ label: 'Test Item' }];
    service.openContextMenu(100, 200, items);
    
    expect(service.isContextMenuOpen()).toBe(true);
    expect(service.contextMenuPosition()).toEqual({ x: 100, y: 200 });
    expect(service.contextMenuItems()).toEqual(items);
    
    service.closeContextMenu();
    expect(service.isContextMenuOpen()).toBe(false);
    expect(service.contextMenuItems()).toEqual([]);
  });

  it('should close all overlays', () => {
    service.toggleNotificationDropdown();
    service.toggleProfileMenu();
    service.openContextMenu(0, 0, []);
    
    service.closeAllOverlays();
    expect(service.isNotificationDropdownOpen()).toBe(false);
    expect(service.isProfileMenuOpen()).toBe(false);
    expect(service.isContextMenuOpen()).toBe(false);
  });
});
