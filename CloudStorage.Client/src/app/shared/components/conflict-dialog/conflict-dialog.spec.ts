import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConflictDialogComponent } from './conflict-dialog.component';
import { By } from '@angular/platform-browser';

describe('ConflictDialogComponent', () => {
  let component: ConflictDialogComponent;
  let fixture: ComponentFixture<ConflictDialogComponent>;

  const mockConflicts = [
    { 
      fileId: 'f1', 
      fileName: 'document.pdf',
      localLastModified: new Date().toISOString(),
      serverLastModified: new Date().toISOString(),
      localVersionVector: null,
      serverVersionVector: null,
      serverSize: 1024,
      localSize: 1024,
      serverVersion: 1
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConflictDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConflictDialogComponent);
    component = fixture.componentInstance;
    component.conflicts = mockConflicts;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit resolved event when Keep Local is clicked', () => {
    const spy = vi.spyOn(component.resolved, 'emit');
    // Using text content to be more resilient
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const localBtn = buttons.find(b => b.nativeElement.textContent.includes('Sequence_Local'));
    localBtn?.triggerEventHandler('click', null);

    expect(spy).toHaveBeenCalledWith({ fileId: 'f1', resolution: 'KeepLocal' });
  });

  it('should emit resolved event when Keep Cloud is clicked', () => {
    const spy = vi.spyOn(component.resolved, 'emit');
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const cloudBtn = buttons.find(b => b.nativeElement.textContent.includes('Sequence_Cloud'));
    cloudBtn?.triggerEventHandler('click', null);

    expect(spy).toHaveBeenCalledWith({ fileId: 'f1', resolution: 'KeepServer' });
  });

  it('should emit closed event when Abort is clicked', () => {
    const spy = vi.spyOn(component.closed, 'emit');
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const abortBtn = buttons.find(b => b.nativeElement.textContent.includes('Abort_Resolution_Loop'));
    abortBtn?.triggerEventHandler('click', null);

    expect(spy).toHaveBeenCalled();
  });
});
