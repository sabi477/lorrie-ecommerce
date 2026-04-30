import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export type AppRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

export const roleGuard = (allowedRoles: AppRole[]): CanActivateFn => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) { router.navigate(['/login']); return false; }
  const role = auth.getRole() as AppRole;
  if (allowedRoles.includes(role)) return true;
  router.navigate(['/dashboard']);
  return false;
};
