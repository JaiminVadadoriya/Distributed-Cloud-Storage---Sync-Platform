export interface SyncEvent {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'conflict' | 'rename' | 'move';
  fileName: string;
  deviceName: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  details?: string;
}

export interface SyncConflict {
  fileId: string;
  fileName: string;
  localLastModified: string;
  serverLastModified: string;
  localVersionVector: string | null;
  serverVersionVector: string | null;
  localSize: number;
  serverSize: number;
  serverVersion: number;
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
