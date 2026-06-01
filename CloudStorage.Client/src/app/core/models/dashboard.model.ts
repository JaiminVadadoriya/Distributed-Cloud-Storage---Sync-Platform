export interface DashboardStats {
  totalStorageBytes: number;
  maxStorageBytes: number;
  totalFiles: number;
  recentUploads: number;
}

export interface StorageBreakdown {
  category: string;
  bytes: number;
  count: number;
  color: string;
}
