import { Directive, output, signal } from '@angular/core';

@Directive({
  selector: '[appDragDrop]',
  standalone: true,
  host: {
    '[class.drag-over]': 'isDragging()',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)'
  }
})
export class DragDropDirective {
  filesDropped = output<FileList>();
  isDragging = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (event?.dataTransfer?.files?.length) {
      this.filesDropped.emit(event.dataTransfer.files);
    }
  }
}
