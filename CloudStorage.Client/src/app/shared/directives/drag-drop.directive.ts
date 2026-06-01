import { Directive, output, signal } from '@angular/core';

@Directive({
  selector: '[appDragDrop]',
  standalone: true,
  host: {
    '[class.drag-over]': 'isDragging()',
    '(dragenter)': 'onDragEnter($event)',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)'
  }
})
export class DragDropDirective {
  filesDropped = output<File[] | FileList>();
  dragEnter = output<void>();
  dragLeave = output<void>();

  isDragging = signal(false);

  /** Track enter/leave depth to avoid false leaves from child elements */
  private _depth = 0;

  onDragEnter(event: DragEvent): void {
    if (!this.hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this._depth++;
    if (this._depth === 1) {
      this.isDragging.set(true);
      this.dragEnter.emit();
    }
  }

  onDragOver(event: DragEvent): void {
    if (!this.hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    // Ensure dragging stays true while hovering (needed if dragenter was missed)
    if (!this.isDragging()) {
      this._depth = 1;
      this.isDragging.set(true);
      this.dragEnter.emit();
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._depth--;
    if (this._depth <= 0) {
      this._depth = 0;
      this.isDragging.set(false);
      this.dragLeave.emit();
    }
  }

  onDrop(event: DragEvent): void {
    if (!this.hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this._depth = 0;
    this.isDragging.set(false);
    this.dragLeave.emit();

    const items = event.dataTransfer?.items;
    if (items) {
      const files: File[] = [];
      const promises: Promise<void>[] = [];

      for (const item of Array.from(items)) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        } else {
          const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
          if (entry) {
            promises.push(this.traverseFileTree(entry, files));
          }
        }
      }

      Promise.all(promises).then(() => {
        if (files.length > 0) {
          // Emit a virtual FileList-like object or just the array of files
          // Since our component expects FileList, we'll emit the first batch or adapt the component
          this.filesDropped.emit(files);
        }
      });
    } else if (event.dataTransfer?.files?.length) {
      this.filesDropped.emit(event.dataTransfer.files);
    }
  }

  private hasFiles(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    return !!(types && Array.from(types).includes('Files'));
  }

  private traverseFileTree(item: FileSystemEntry, files: File[], path = ''): Promise<void> {
    return new Promise((resolve) => {
      if (item.isFile) {
        (item as FileSystemFileEntry).file((file: File) => {
          files.push(file);
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = (item as FileSystemDirectoryEntry).createReader();
        const allEntries: FileSystemEntry[] = [];
        
        const readAllEntries = () => {
          dirReader.readEntries((entries: FileSystemEntry[]) => {
            if (entries.length > 0) {
              allEntries.push(...entries);
              readAllEntries(); // Read next batch
            } else {
              // Finish reading this directory
              const entryPromises = allEntries.map(entry => this.traverseFileTree(entry, files, path + item.name + '/'));
              Promise.all(entryPromises).then(() => resolve());
            }
          });
        };
        
        readAllEntries();
      } else {
        resolve();
      }
    });
  }
}
