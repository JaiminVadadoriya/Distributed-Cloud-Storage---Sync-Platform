import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploadComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit filesSelected event when file is selected via input', () => {
    vi.spyOn(component.filesSelected, 'emit');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    // Mock the input change event
    const event = { target: { files: [file] } } as unknown as Event;

    component.onFileSelected(event);

    expect(component.filesSelected.emit).toHaveBeenCalledWith([
      expect.objectContaining({
        file: file,
        valid: true
      })
    ]);
  });

  it('should validate max file size', () => {
    vi.spyOn(component.filesSelected, 'emit');
    // Create a large file > 50GB
    const largeFile = { name: 'large.bin', size: 50 * 1024 * 1024 * 1024 + 1 } as unknown as File; 
    const event = { target: { files: [largeFile] } } as unknown as Event;

    component.onFileSelected(event);
    
    expect(component.filesSelected.emit).toHaveBeenCalledWith([
      expect.objectContaining({
        file: largeFile,
        valid: false,
        errors: expect.arrayContaining([expect.stringContaining('File size exceeds')])
      })
    ]);
  });

  it('should handle drag over event', () => {
    const event = { 
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as unknown as DragEvent;
    
    component.onDragOver(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.isDragging).toBe(true);
  });

  it('should handle drag leave event', () => {
    const event = { 
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as unknown as DragEvent;
      
      component.isDragging = true;
      component.onDragLeave(event);
  
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.isDragging).toBe(false);
  });

  it('should handle drop event', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const event = { 
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { files: [file] }
    } as unknown as DragEvent;
    vi.spyOn(component.filesSelected, 'emit');

    component.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragging).toBe(false);
    expect(component.filesSelected.emit).toHaveBeenCalledWith([
      expect.objectContaining({
        file: file,
        valid: true
      })
    ]);
  });
});
