import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { FolderService } from '../../../core/services/folder.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-folder-view',
  imports: [CommonModule, RouterModule],
  templateUrl: './folder-view.html',
  styleUrl: './folder-view.css',
})
export class FolderView extends BaseComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private folderService = inject(FolderService);
  private fileService = inject(FileService);

  folderId = signal<string | null>(null);
  folder = signal<any>(null);
  files = signal<any[]>([]);
  subFolders = signal<any[]>([]);
  breadcrumbs = signal<{ id: string | null; name: string }[]>([]);

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
        next: (data: any) => {
          this.folder.set(data);
          this.subFolders.set(data?.subFolders || []);
          this.files.set(data?.files || []);
          this.buildBreadcrumbs(data);
          this.isBusy.set(false);
        },
        error: () => this.isBusy.set(false)
      });
  }

  private buildBreadcrumbs(folder: any) {
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
    this.router.navigate(['/files', fileId]);
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
