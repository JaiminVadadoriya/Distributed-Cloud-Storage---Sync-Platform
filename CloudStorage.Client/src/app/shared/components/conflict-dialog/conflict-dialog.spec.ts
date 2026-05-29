import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConflictDialogComponent } from './conflict-dialog.component';


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
    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll('button');
    const localBtn = Array.from(buttons).find(b => b.textContent?.includes('Keep Local'));
    
    localBtn?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({ fileId: 'f1', resolution: 'KeepLocal' });
  });

  it('should emit resolved event when Keep Cloud is clicked', () => {
    const spy = vi.spyOn(component.resolved, 'emit');
    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll('button');
    const cloudBtn = Array.from(buttons).find(b => b.textContent?.includes('Keep Server'));
    
    cloudBtn?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({ fileId: 'f1', resolution: 'KeepServer' });
  });

  it('should emit closed event when Abort is clicked', () => {
    const spy = vi.spyOn(component.closed, 'emit');
    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll('button');
    const abortBtn = Array.from(buttons).find(b => b.textContent?.includes('Cancel Sync'));
    
    abortBtn?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalled();
  });
});
