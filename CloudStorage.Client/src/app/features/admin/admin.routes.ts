import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./user-management/user-management.component').then(m => m.UserManagementComponent)
  },
  {
    path: 'health',
    loadComponent: () => import('./system-health/system-health.component').then(m => m.SystemHealthComponent)
  },
  {
    path: 'audit',
    loadComponent: () => import('./admin-audit/admin-audit.component').then(m => m.AdminAuditComponent)
  },
  {
    path: 'metrics',
    loadComponent: () => import('./system-metrics/system-metrics.component').then(m => m.SystemMetricsComponent)
  }
];
