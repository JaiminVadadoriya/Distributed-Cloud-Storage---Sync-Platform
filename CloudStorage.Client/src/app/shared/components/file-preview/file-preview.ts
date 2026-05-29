import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BaseComponent } from '../../../core/models/base-component';

@Component({
  selector: 'app-file-preview',
  imports: [CommonModule],
  templateUrl: './file-preview.html',
  styleUrl: './file-preview.css',
})
export class FilePreview extends BaseComponent {
  fileUrl = input<string>('');
  contentType = input<string>('');
  fileName = input<string>('');
  textContent = input<string>(''); // Optional text content for code/text files

  private sanitizer = inject(DomSanitizer);

  get isImage(): boolean {
    const type = this.contentType()?.toLowerCase() || '';
    return type.startsWith('image/') || 
           ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'].some(ext => this.fileName().toLowerCase().endsWith(ext));
  }

  get isVideo(): boolean {
    const type = this.contentType()?.toLowerCase() || '';
    return type.startsWith('video/') || 
           ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some(ext => this.fileName().toLowerCase().endsWith(ext));
  }

  get isAudio(): boolean {
    const type = this.contentType()?.toLowerCase() || '';
    return type.startsWith('audio/') || 
           ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].some(ext => this.fileName().toLowerCase().endsWith(ext));
  }

  get isPdf(): boolean {
    return this.contentType() === 'application/pdf' || this.fileName().toLowerCase().endsWith('.pdf');
  }

  get isText(): boolean {
    const type = this.contentType()?.toLowerCase() || '';
    return type.startsWith('text/') || 
           ['.txt', '.md', '.json', '.xml', '.csv', '.ts', '.js', '.py', '.html', '.css', '.yaml', '.yml'].some(ext => this.fileName().toLowerCase().endsWith(ext));
  }

  get isDocument(): boolean {
    return ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'].some(ext => this.fileName().toLowerCase().endsWith(ext));
  }

  get safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl());
  }

  get isUnsupported(): boolean {
    return !this.isImage && !this.isVideo && !this.isPdf && !this.isAudio && !this.isText && !this.isDocument;
  }
}
