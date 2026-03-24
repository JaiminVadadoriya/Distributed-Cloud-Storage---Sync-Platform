import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SignalRService } from './signalr.service';
import { AuthService } from './auth.service';

describe('SignalRService', () => {
  let service: SignalRService;
  let authServiceMock: any;

  beforeEach(() => {
    authServiceMock = { getToken: vi.fn() } as any;
    // Return null initially, user not logged in
    authServiceMock.getToken.mockReturnValue(null);

    TestBed.configureTestingModule({
      providers: [
        SignalRService,
        { provide: AuthService, useValue: authServiceMock }
      ]
    });
    service = TestBed.inject(SignalRService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not start connection if no token', () => {
    authServiceMock.getToken.mockReturnValue(null);
    service.startConnection();
    // In our implementation, hubConnection isn't created if there's no token.
    // We can just verify it doesn't throw.
    expect((service as any).hubConnection).toBeNull();
  });
});
