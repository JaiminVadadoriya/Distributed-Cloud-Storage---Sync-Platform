import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilePreview } from './file-preview';
import { DomSanitizer } from '@angular/platform-browser';

describe('FilePreview', () => {
  let component: FilePreview;
  let fixture: ComponentFixture<FilePreview>;
  let sanitizer: Mocked<DomSanitizer>;

  beforeEach(async () => {
    sanitizer = {
      // Mock returning a "safe" value that Angular will accept for [src]
      // In a real test environment, this would be a SafeResourceUrlImpl
      bypassSecurityTrustResourceUrl: vi.fn().mockImplementation((val) => val)
    } as unknown as Mocked<DomSanitizer>;

    await TestBed.configureTestingModule({
      imports: [FilePreview],
      providers: [
        { provide: DomSanitizer, useValue: sanitizer }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FilePreview);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should bypass security for the file URL', () => {
    fixture.componentRef.setInput('fileUrl', 'blob:http://localhost/123');
    fixture.componentRef.setInput('contentType', 'application/pdf');
    
    // We don't call detectChanges here because [src] binding will trigger the security check
    // and fail if our mock doesn't return a "real" SafeResourceUrl.
    // Instead, we test the logic via the getter.
    
    const url = component.safeUrl;
    expect(url).toBe('blob:http://localhost/123');
    expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('blob:http://localhost/123');
  });

  it('should identify content types correctly', () => {
    fixture.componentRef.setInput('contentType', 'image/png');
    expect(component.isImage).toBe(true);
    expect(component.isVideo).toBe(false);

    fixture.componentRef.setInput('contentType', 'video/mp4');
    expect(component.isVideo).toBe(true);
    expect(component.isImage).toBe(false);

    fixture.componentRef.setInput('contentType', 'application/pdf');
    expect(component.isPdf).toBe(true);
  });
});
