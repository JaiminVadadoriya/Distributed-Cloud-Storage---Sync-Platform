/**
 * File-specific model interfaces.
 * Other domain types have been extracted to their own cohesive modules:
 *   - folder.model.ts, dashboard.model.ts, trash.model.ts, sync.model.ts
 *   - notification.model.ts, device.model.ts, search.model.ts, audit.model.ts
 * 
 * For backward compatibility, all types are also re-exported from ./index.ts
 */

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  modified: Date;
  owner: string;
  versionVector: string | null;
  lastModifiedAt: string;
  folderId?: string | null;
  isShared?: boolean;
  permissions?: Permission[];
}

export interface ApiFileResponse {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
  lastModifiedAt: string;
  isShared: boolean;
  ownerId?: string;
  versionVector: string | null;
  folderId?: string | null;
  contentType?: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  size: number;
  createdAt: string;
  createdBy: string;
  changeDescription?: string;
}

export interface Permission {
  userId: number;
  userName: string;
  email: string;
  permissionType: 'Read' | 'Write' | 'Owner';
  grantedAt: string;
}

// Re-export from cohesive domain modules for backward compatibility
export type { Folder } from './folder.model';
export type { DashboardStats, StorageBreakdown } from './dashboard.model';
export type { TrashItem } from './trash.model';
export type { SyncEvent, SyncConflict, ConflictItem } from './sync.model';
export type { NotificationItem } from './notification.model';
export type { DeviceInfo } from './device.model';
export type { SearchFilter } from './search.model';
export type { AuditEntry } from './audit.model';
