import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { FolderService, CreateFolderDto } from '../../../core/services/folder.service';
import { Folder, FileItem } from '../../../core/models/file.model';
import { takeUntil, tap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationService } from '../../../core/services/notification.service';
import { formatBytes } from '../../../core/utils/format.utils';
import { UploadManagerService } from '../../../core/services/upload-manager.service';

@Component({
  selector: 'app-folder-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DragDropModule],
  templateUrl: './folder-view.html',
  styleUrl: './folder-view.css',
})
export class FolderView extends BaseComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private folderService = inject(FolderService);
  private fileService = inject(FileService);
  private layoutService = inject(LayoutService);
  private notificationService = inject(NotificationService);
  private uploadManager = inject(UploadManagerService);

  folderId = signal<string | null>(null);
  folder = signal<Folder | null>(null);
  files = signal<FileItem[]>([]);
  subFolders = signal<Folder[]>([]);
  breadcrumbs = signal<{ id: string | null; name: string }[]>([]);
  
  constructor() {
    super();
    this.uploadManager.uploadCompleted$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadFolder();
    });
  }

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.folderId.set(params['id'] || null);
      this.loadFolder();
    });
  }

  private loadFolder() {
    const id = this.folderId();
    if (!id) {
      this.breadcrumbs.set([{ id: null, name: 'My Files' }]);
      return;
    }

    this.isBusy.set(true);
    this.folderService.getFolderById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Folder) => {
          this.folder.set(data);
          this.subFolders.set(data?.subFolders || []);
          this.files.set(data?.files || []);
          this.buildBreadcrumbs(data);
          this.isBusy.set(false);
        },
        error: () => this.isBusy.set(false)
      });
  }

  private buildBreadcrumbs(folder: Folder) {
    const trail: { id: string | null; name: string }[] = [{ id: null, name: 'My Files' }];
    if (folder?.path) {
      for (const segment of folder.path) {
        trail.push({ id: segment.id, name: segment.name });
      }
    }
    trail.push({ id: folder?.id, name: folder?.name || 'Folder' });
    this.breadcrumbs.set(trail);
  }

  navigateTo(folderId: string | null) {
    if (folderId) {
      this.router.navigate(['/folders', folderId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  openFile(fileId: string) {
    this.router.navigate(['/preview', fileId]);
  }

  formatSize = formatBytes;

  createNewFolder() {
    this.layoutService.openPrompt({
      title: 'Initialize_Node',
      placeholder: 'Enter folder name...',
      action: (folderName: string) => {
        if (!folderName || !folderName.trim()) return;

        const dto: CreateFolderDto = {
          name: folderName.trim(),
          parentFolderId: this.folderId()
        };

        this.folderService.createFolder(dto)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadFolder(); // Refresh current view
              this.notificationService.success(`Folder '${folderName}' created.`);
            },
            error: (err) => {
              console.error('Failed to create folder:', err);
              this.notificationService.error('Failed to create folder.');
            }
          });
      }
    });
  }

  onDrop<T, O>(event: CdkDragDrop<T, O, FileItem | Folder>, targetFolderId: string | null) {
    const item = event.item.data as (FileItem | Folder);
    if (!item || item.id === targetFolderId) return;

    // Determine if it was a file or folder being dragged
    const isFile = 'size' in item;
    
    if (isFile) {
      if (item.folderId === targetFolderId) return;
      this.fileService.moveFile(item.id, targetFolderId).subscribe({
        next: () => {
          this.loadFolder();
          this.notificationService.success(`Moved ${item.name} successfully.`);
        },
        error: () => this.notificationService.error(`Failed to move ${item.name}.`)
      });
    } else {
      if ((item as Folder).parentId === targetFolderId) return;
      this.folderService.moveFolder(item.id, targetFolderId).subscribe({
        next: () => {
          this.loadFolder();
          this.notificationService.success(`Moved ${item.name} successfully.`);
        },
        error: () => this.notificationService.error(`Failed to move folder ${item.name}.`)
      });
    }
  }

  onFolderContextMenu(event: MouseEvent, folder: Folder) {
    event.preventDefault();
    event.stopPropagation();
    this.layoutService.openContextMenu(event.clientX, event.clientY, [
      { 
        label: 'OPEN_ENTITY', 
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
        action: () => this.navigateTo(folder.id) 
      },
      { separator: true, label: '' },
      { 
        label: 'RENAME_FOLDER', 
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
        action: () => {
          this.layoutService.openPrompt({
            title: 'Rename_Folder',
            initialValue: folder.name,
            action: (newName: string) => {
              if (newName && newName !== folder.name) {
                this.folderService.renameFolder(folder.id, newName).subscribe(() => this.loadFolder());
              }
            }
          });
        }
      },
      { 
        label: 'SHARE_RESOURCE', 
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>',
        action: () => {
          this.layoutService.openPrompt({
            title: 'Share_Folder',
            placeholder: 'Enter target User ID:',
            action: (userIdStr: string) => {
              if (userIdStr) {
                this.folderService.shareFolder(folder.id, parseInt(userIdStr)).subscribe();
              }
            }
          });
        }
      },
      { separator: true, label: '' },
      { 
        label: 'PURGE_DIRECTORY', 
        danger: true,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
        action: () => {
          this.layoutService.openConfirm({
            title: 'PURGE_SEQUENCE',
            message: `Delete folder "${folder.name}" and all its contents?`,
            danger: true,
            action: () => this.folderService.deleteFolder(folder.id).pipe(
              tap({
                next: () => {
                  this.notificationService.success(`Folder '${folder.name}' deleted.`);
                  this.loadFolder();
                },
                error: (err) => {
                  console.error('Delete folder failed:', err);
                  this.notificationService.error(`Failed to delete folder '${folder.name}'.`);
                }
              })
            )
          });
        }
      }
    ]);
  }

  onFileContextMenu(event: MouseEvent, file: FileItem) {
    event.preventDefault();
    event.stopPropagation();
    this.layoutService.openContextMenu(event.clientX, event.clientY, [
      { 
        label: 'OPEN_ENTITY', 
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
        action: () => this.openFile(file.id) 
      },
      { 
        label: 'DOWNLOAD_SEQUENCE', 
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
        action: () => this.fileService.downloadFile(file.id, file.name)
      },
      { separator: true, label: '' },
      { 
        label: 'SHARE_RESOURCE', 
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>',
        action: () => {
          this.layoutService.openPrompt({
            title: 'Share_File',
            placeholder: 'Enter target User ID:',
            action: (userIdStr: string) => {
              if (userIdStr) {
                this.fileService.shareFile(file.id, parseInt(userIdStr)).subscribe();
              }
            }
          });
        }
      },
      { separator: true, label: '' },
      { 
        label: 'PURGE_RECORD', 
        danger: true,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
        action: () => {
          this.layoutService.openConfirm({
            title: 'PURGE_SEQUENCE',
            message: `Delete file "${file.name}"?`,
            danger: true,
            action: () => this.fileService.deleteFile(file.id).pipe(
              tap({
                next: () => {
                  this.notificationService.success(`File '${file.name}' deleted.`);
                  this.loadFolder();
                },
                error: (err) => {
                  console.error('Delete file failed:', err);
                  this.notificationService.error(`Failed to delete file '${file.name}'.`);
                }
              })
            )
          });
        }
      }
    ]);
  }
}
