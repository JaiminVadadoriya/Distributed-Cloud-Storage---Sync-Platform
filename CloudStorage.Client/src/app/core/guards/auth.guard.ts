import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Authentication Guard ensures only authenticated identities 
 * can access protected application routes.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  // SYSTEM_NOTICE: Unauthorized access attempt detected. Redirecting to login.
  router.navigate(['/auth/login']);
  return false;
};
