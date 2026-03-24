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

export interface DashboardStats {
  totalStorageBytes: number;
  maxStorageBytes: number;
  totalFiles: number;
  recentUploads: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  path?: { id: string; name: string }[];
  subFolders?: Folder[];
  files?: FileItem[];
}

export interface TrashItem {
  id: string;
  originalId: string;
  name: string;
  size: number;
  type: string;
  deletedAt: string;
  expiresAt: string;
  originalPath: string;
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

export interface AuditEntry {
  id: string;
  action: string;
  targetName: string;
  targetType: 'file' | 'folder' | 'user' | 'system';
  performedBy: string;
  performedAt: string;
  details?: string;
  ipAddress?: string;
}

export interface SyncEvent {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'conflict' | 'rename' | 'move';
  fileName: string;
  deviceName: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  details?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'browser';
  lastSyncAt: string;
  status: 'online' | 'offline' | 'syncing';
  os: string;
  ipAddress?: string;
  isCurrent: boolean;
}

export interface SearchFilter {
  query: string;
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  owner?: string;
  sortBy?: 'name' | 'date' | 'size' | 'type';
  sortDir?: 'asc' | 'desc';
}

export interface ConflictItem {
  id: string;
  fileId: string;
  fileName: string;
  localVersion: { size: number; modifiedAt: string; hash: string };
  serverVersion: { size: number; modifiedAt: string; hash: string };
  detectedAt: string;
  status: 'unresolved' | 'resolved';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface StorageBreakdown {
  category: string;
  bytes: number;
  count: number;
  color: string;
}
