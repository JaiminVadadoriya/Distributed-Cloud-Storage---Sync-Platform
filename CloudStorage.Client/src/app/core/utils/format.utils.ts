/**
 * Shared formatting utilities.
 * Extracted from DashboardComponent and other components for reuse.
 */

/**
 * Converts a byte count into a human-readable string (e.g., "1.5 GB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Truncates a filename if it exceeds the max length, preserving the extension.
 */
export function truncateFileName(name: string, maxLength = 30): string {
  if (name.length <= maxLength) return name;
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  const base = name.slice(0, maxLength - ext.length - 3);
  return `${base}...${ext}`;
}
