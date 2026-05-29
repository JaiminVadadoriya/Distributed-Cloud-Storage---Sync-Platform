export interface SearchFilter {
  query: string;
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  owner?: string;
  sortBy?: 'name' | 'date' | 'size' | 'type';
  sortDir?: 'asc' | 'desc';
}
