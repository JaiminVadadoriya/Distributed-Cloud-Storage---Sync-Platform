import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivityService } from './activity.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

describe('ActivityService', () => {
  let service: ActivityService;
  let apiMock: any;

  beforeEach(() => {
    apiMock = {
      get: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ActivityService,
        { provide: ApiService, useValue: apiMock }
      ]
    });
    service = TestBed.inject(ActivityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch recent activity', async () => {
    const mockData = [
      { id: '1', eventType: 'upload', targetId: 'f1', targetName: 'test.txt', timestamp: new Date().toISOString() }
    ];
    apiMock.get.mockReturnValue(of({ success: true, data: mockData }));

    const activities = await firstValueFrom(service.getRecentActivity(10));
    
    expect(activities).toEqual(mockData);
    expect(apiMock.get).toHaveBeenCalledWith('/activity', expect.any(HttpParams));
    const params = apiMock.get.mock.calls[0][1] as HttpParams;
    expect(params.get('limit')).toBe('10');
  });

  it('should return empty array if no data', async () => {
    apiMock.get.mockReturnValue(of({ success: true, data: null }));

    const activities = await firstValueFrom(service.getRecentActivity());
    expect(activities).toEqual([]);
  });
});
