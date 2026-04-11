import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * AdminGuard restricts access to the admin panel.
 * In production this would check an `isAdmin` claim on the JWT.
 * For now it falls back to checking an `isAdmin` flag in localStorage
 * so that E2E tests and dev mode work without a real admin user.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    router.navigate(['/auth/login']);
    return false;
  }

  // Check for admin role in user object
  const user = authService.currentUser();

  // Strict check for 'Admin' role. No bypasses for localhost or local flags.
  if (user && user.role === 'Admin') {
    return true;
  }

  console.warn(`[AdminGuard] Access denied for user: ${user?.username} (Role: ${user?.role})`);
  router.navigate(['/dashboard']);
  return false;
};
