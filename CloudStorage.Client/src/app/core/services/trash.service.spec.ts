import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TrashService } from './trash.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('TrashService', () => {
  let service: TrashService;
  let apiServiceMock: Mocked<ApiService>;

  beforeEach(() => {
    apiServiceMock = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
      patch: vi.fn()
    } as unknown as Mocked<ApiService>;

    TestBed.configureTestingModule({
      providers: [
        TrashService,
        { provide: ApiService, useValue: apiServiceMock }
      ]
    });
    service = TestBed.inject(TrashService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get trash items', () => {
    const mockTrash = [{ id: 't1', fileName: 'deleted.txt', deletedAt: new Date() }];
    apiServiceMock.get.mockReturnValue(of({ success: true, data: mockTrash }));

    service.getTrashItems().subscribe(items => {
      expect(items).toEqual(mockTrash);
    });
    expect(apiServiceMock.get).toHaveBeenCalledWith('/trash');
  });

  it('should restore file', () => {
    apiServiceMock.post.mockReturnValue(of({ success: true }));

    service.restoreFile('t1').subscribe();
    expect(apiServiceMock.post).toHaveBeenCalledWith('/trash/t1/restore', {});
  });

  it('should empty trash', () => {
    apiServiceMock.delete.mockReturnValue(of({ success: true }));

    service.emptyTrash().subscribe();
    expect(apiServiceMock.delete).toHaveBeenCalledWith('/trash/empty');
  });
});
