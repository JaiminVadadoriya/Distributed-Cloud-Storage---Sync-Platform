import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BaseComponent } from '../../../core/models/base-component';
import { inject } from '@angular/core';

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

  private sanitizer = inject(DomSanitizer);

  get isImage(): boolean {
    return this.contentType()?.startsWith('image/') || false;
  }

  get isVideo(): boolean {
    return this.contentType()?.startsWith('video/') || false;
  }

  get isPdf(): boolean {
    return this.contentType() === 'application/pdf';
  }

  get isAudio(): boolean {
    return this.contentType()?.startsWith('audio/') || false;
  }

  get safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl());
  }

  get isUnsupported(): boolean {
    return !this.isImage && !this.isVideo && !this.isPdf && !this.isAudio;
  }
}
