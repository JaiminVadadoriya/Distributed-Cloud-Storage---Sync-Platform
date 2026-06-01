import { Directive, EventEmitter, Output, signal } from '@angular/core';

@Directive({
  selector: '[appDragDrop]',
  standalone: true,
  host: {
    '[class.border-primary-500]': 'fileOver()',
    '[class.bg-primary-50]': 'bgOver()',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)'
  }
})
export class DragDrop {
  @Output() fileDropped = new EventEmitter<FileList>();

  protected readonly fileOver = signal(false);
  protected readonly bgOver = signal(false);

  public onDragOver(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver.set(true);
    this.bgOver.set(true);
  }

  public onDragLeave(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver.set(false);
    this.bgOver.set(false);
  }

  public onDrop(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver.set(false);
    this.bgOver.set(false);
    
    const files = evt.dataTransfer?.files;
    if (files && files.length > 0) {
      this.fileDropped.emit(files);
    }
  }
}
