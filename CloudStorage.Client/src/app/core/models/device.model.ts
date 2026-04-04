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
