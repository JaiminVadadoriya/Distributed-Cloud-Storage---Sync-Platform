import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentComponent } from './recent.component';
import { FileService } from '../../../core/services/file.service';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('RecentComponent', () => {
  let component: RecentComponent;
  let fixture: ComponentFixture<RecentComponent>;
  let fileServiceMock: Mocked<FileService>;

  const mockFiles = [
    { id: '1', name: 'old.txt', lastModifiedAt: '2023-01-01T00:00:00Z', size: 100 },
    { id: '2', name: 'new.txt', lastModifiedAt: '2024-01-01T00:00:00Z', size: 200 }
  ];

  beforeEach(async () => {
    fileServiceMock = {
      getFiles: vi.fn().mockReturnValue(of(mockFiles)),
      getDashboardStats: vi.fn(),
      getFileById: vi.fn(),
      deleteFile: vi.fn(),
      getStorageBreakdown: vi.fn(),
      isLoading: signal(false)
    } as unknown as Mocked<FileService>;

    await TestBed.configureTestingModule({
      imports: [RecentComponent, RouterTestingModule],
      providers: [
        { provide: FileService, useValue: fileServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load and sort files by modification date', async () => {
    await fixture.whenStable();

    expect(fileServiceMock.getFiles).toHaveBeenCalled();
    const recent = component.recentFiles();
    expect(recent.length).toBe(2);
    expect(recent[0].id).toBe('2'); // Newest first
    expect(recent[1].id).toBe('1');
  });

  it('should format file size', () => {
    expect(component.formatSize(1024 * 1024)).toBe('1 MB');
  });
});
