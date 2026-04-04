export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  path?: { id: string; name: string }[];
  subFolders?: Folder[];
  files?: import('./file.model').FileItem[];
}
