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
