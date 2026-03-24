import { Directive, output, HostListener, HostBinding, signal } from '@angular/core';

@Directive({
  selector: '[appDragDrop]',
  standalone: true
})
export class DragDropDirective {
  filesDropped = output<FileList>();
  
  private _isDragging = signal(false);
  
  @HostBinding('class.drag-over') get dragOver() { return this._isDragging(); }

  @HostListener('dragover', ['$event']) onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._isDragging.set(true);
  }

  @HostListener('dragleave', ['$event']) onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._isDragging.set(false);
  }

  @HostListener('drop', ['$event']) onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._isDragging.set(false);
    if (event.dataTransfer?.files.length) {
      this.filesDropped.emit(event.dataTransfer.files);
    }
  }
}
