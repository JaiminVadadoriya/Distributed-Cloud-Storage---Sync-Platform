import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadProgressComponent } from './upload-progress.component';
import { vi } from 'vitest';

describe('UploadProgressComponent', () => {
  let component: UploadProgressComponent;
  let fixture: ComponentFixture<UploadProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadProgressComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadProgressComponent);
    component = fixture.componentInstance;
    component.progress = {
      fileName: 'test.txt',
      fileSize: 1024,
      uploadedChunks: 0,
      totalChunks: 1,
      uploadSpeed: 0,
      status: 'pending'
    };
    await fixture.whenStable();
  });

  it('should create', async () => {
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it('should calculate progress percentage', () => {
    component.progress = {
      fileName: 'test.txt',
      fileSize: 100,
      uploadedChunks: 5,
      totalChunks: 10,
      uploadSpeed: 100,
      status: 'uploading'
    };
    expect(component.progressPercentage).toBe(50);
  });

  it('should format sizes correctly', () => {
    component.progress = {
      fileName: 'test.txt',
      fileSize: 1024,
      uploadedChunks: 1,
      totalChunks: 1,
      uploadSpeed: 100,
      status: 'complete'
    };
    expect(component.totalSizeFormatted).toBe('1 KB'); 
  });

  it('should emit pause event', () => {
    vi.spyOn(component.uploadPaused, 'emit');
    component.onPause();
    expect(component.uploadPaused.emit).toHaveBeenCalled();
  });

  it('should emit resume event', () => {
    vi.spyOn(component.uploadResumed, 'emit');
    component.onResume();
    expect(component.uploadResumed.emit).toHaveBeenCalled();
  });

  it('should emit cancel event', () => {
    vi.spyOn(component.uploadCancelled, 'emit');
    component.onCancel();
    expect(component.uploadCancelled.emit).toHaveBeenCalled();
  });

  it('should calculate remaining time', () => {
    // 1000 bytes total, 500 bytes uploaded (5 chunks * 100 bytes/chunk), 100 bytes/sec speed
    // Remaining: 500 bytes / 100 bytes/sec = 5 seconds
    component.progress = {
      fileName: 'test.txt',
      fileSize: 1000,
      uploadedChunks: 5,
      totalChunks: 10, // implies 100 bytes per chunk average
      uploadSpeed: 100,
      status: 'uploading'
    };
    
    expect(component.estimatedTimeRemaining).toBe('5s');
  });
});
