import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PermissionService } from './permission.service';
import { ApiService } from './api.service';
import { of, throwError } from 'rxjs';

describe('PermissionService', () => {
  let service: PermissionService;
  let apiServiceMock: Mocked<ApiService>;

  beforeEach(() => {
    apiServiceMock = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    } as unknown as Mocked<ApiService>;

    TestBed.configureTestingModule({
      providers: [
        PermissionService,
        { provide: ApiService, useValue: apiServiceMock }
      ]
    });
    service = TestBed.inject(PermissionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get permissions', () => {
    const mockData = [{ userId: 1, email: 'user@test.com', role: 'Viewer' }];
    apiServiceMock.get.mockReturnValue(of({ success: true, data: mockData }));

    service.getPermissions('f1').subscribe(perms => {
      expect(perms).toEqual(mockData);
    });
    expect(apiServiceMock.get).toHaveBeenCalledWith('/files/f1/permissions');
  });

  it('should add permission', () => {
    apiServiceMock.post.mockReturnValue(of({ success: true }));

    service.addPermission('f1', 'test@test.com', 'Editor').subscribe();
    expect(apiServiceMock.post).toHaveBeenCalledWith('/files/f1/permissions', {
      email: 'test@test.com',
      permissionType: 'Editor'
    });
  });

  it('should handle errors in getPermissions', () => {
    apiServiceMock.get.mockReturnValue(throwError(() => new Error('API Error')));

    service.getPermissions('f1').subscribe(perms => {
      expect(perms).toEqual([]);
    });
  });
});
