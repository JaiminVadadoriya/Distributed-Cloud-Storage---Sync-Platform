import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';

/**
 * DownloadProgress shows a persistent progress bar when a large file
 * download is in progress. Since ParallelDownloadService uses
 * showSaveFilePicker (direct-to-disk), progress tracking is handled
 * at the browser level. This component serves as a visual indicator
 * that ties into the service's isLoading signal.
 */
@Component({
  selector: 'app-download-progress',
  imports: [CommonModule],
  templateUrl: './download-progress.html',
  styleUrl: './download-progress.css',
})
export class DownloadProgress extends BaseComponent {
  // ParallelDownloadService uses direct-to-disk streaming via
  // showSaveFilePicker, which doesn't expose granular progress.
  // This component provides a visual "in-progress" indicator
  // that can be enhanced when the service adds progress signals.
}
