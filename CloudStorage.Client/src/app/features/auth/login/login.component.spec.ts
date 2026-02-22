import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: any;
  let router: Router;

  beforeEach(async () => {
    authServiceMock = { login: vi.fn() } as any;

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]) // provide real router for routerLink
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(async () => true);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form when empty', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('should have valid form when filled', () => {
    component.loginForm.controls['identifier'].setValue('user');
    component.loginForm.controls['password'].setValue('password123');
    expect(component.loginForm.valid).toBe(true);
  });

  it('should call authService login on valid submit', () => {
    component.loginForm.controls['identifier'].setValue('user');
    component.loginForm.controls['password'].setValue('pass');
    
    authServiceMock.login.mockReturnValue(of({ accessToken: 'a', refreshToken: 'b', user: { id: '1', username: 'u', email: 'e' }}));
    
    component.onSubmit();
    
    expect(authServiceMock.login).toHaveBeenCalledWith({ identifier: 'user', password: 'pass' });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should display error message on login failure', () => {
    component.loginForm.controls['identifier'].setValue('user');
    component.loginForm.controls['password'].setValue('wrong-pass');
    
    authServiceMock.login.mockReturnValue(throwError(() => ({ error: { message: 'Bad credentials' } })));
    
    component.onSubmit();
    
    expect(component.error).toBe('Bad credentials');
    expect(component.isLoading).toBe(false);
  });
});
