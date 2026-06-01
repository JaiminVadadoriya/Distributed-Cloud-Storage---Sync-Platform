import { Injectable, signal, inject } from '@angular/core';
import { NotificationService } from './notification.service';
import { Observable } from 'rxjs';

export interface Command {
  execute(): Observable<unknown>;
  undo(): Observable<unknown>;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class UndoRedoService {
  private notification = inject(NotificationService);

  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  hasUndo = signal(false);
  hasRedo = signal(false);

  execute(command: Command) {
    command.execute().subscribe({
      next: () => {
        this.undoStack.push(command);
        this.redoStack = [];
        this.updateState();
        
        // Show interactive notification (with Undo action)
        this.notification.info(`${command.message} (Ctrl+Z to Undo)`);
      }
    });
  }

  undo() {
    const command = this.undoStack.pop();
    if (command) {
      command.undo().subscribe({
        next: () => {
          this.redoStack.push(command);
          this.updateState();
          this.notification.info('Action undone.');
        }
      });
    }
  }

  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute().subscribe({
        next: () => {
          this.undoStack.push(command);
          this.updateState();
          this.notification.info('Action redone.');
        }
      });
    }
  }

  private updateState() {
    this.hasUndo.set(this.undoStack.length > 0);
    this.hasRedo.set(this.redoStack.length > 0);
  }
}
