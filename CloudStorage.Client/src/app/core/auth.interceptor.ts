import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Public endpoints that don't need authentication
  const isPublicEndpoint = req.url.includes('/auth/login') || 
                           req.url.includes('/auth/register') ||
                           req.url.includes('/auth/password-reset') ||
                           req.url.includes('/auth/password-reset-request');

  if (token && !isPublicEndpoint) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  return next(req);
};
