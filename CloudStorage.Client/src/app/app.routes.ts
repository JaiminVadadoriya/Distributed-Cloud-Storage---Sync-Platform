import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';
import { AuthLayoutComponent } from './core/layout/auth-layout/auth-layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { 
        path: 'dashboard', 
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      },
      { 
        path: 'files', 
        loadComponent: () => import('./features/dashboard/file-list/file-list.component').then(m => m.FileListComponent) 
      },
      { 
        path: 'folders/:id', 
        loadComponent: () => import('./features/files/folder-view/folder-view').then(m => m.FolderView) 
      },
      { 
        path: 'shared', 
        loadComponent: () => import('./features/files/shared-with-me/shared-with-me.component').then(m => m.SharedWithMeComponent) 
      },
      { 
        path: 'recent', 
        loadComponent: () => import('./features/files/recent/recent.component').then(m => m.RecentComponent) 
      },
      { 
        path: 'activity', 
        loadComponent: () => import('./features/activity/activity.component').then(m => m.ActivityComponent) 
      },
      { 
        path: 'devices', 
        loadComponent: () => import('./features/devices/devices.component').then(m => m.DevicesComponent) 
      },
      { 
        path: 'settings', 
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) 
      },
      { 
        path: 'search', 
        loadComponent: () => import('./features/search/search-results/search-results.component').then(m => m.SearchResultsComponent) 
      },
      { 
        path: 'trash', 
        loadComponent: () => import('./features/files/trash/trash.component').then(m => m.TrashComponent) 
      },
      { 
        path: 'preview/:id', 
        loadComponent: () => import('./features/files/file-preview/file-preview.component').then(m => m.FilePreviewComponent) 
      },
      { 
        path: 'conflicts', 
        loadComponent: () => import('./features/sync/conflict-center/conflict-center.component').then(m => m.ConflictCenterComponent) 
      },
      { 
        path: 'sync-history', 
        loadComponent: () => import('./features/sync/sync-history/sync-history.component').then(m => m.SyncHistoryComponent) 
      },
      { 
        path: 'audit-log', 
        loadComponent: () => import('./features/activity/audit-log/audit-log.component').then(m => m.AuditLogComponent) 
      },
      { 
        path: 'system-metrics', 
        loadComponent: () => import('./features/admin/system-metrics/system-metrics.component').then(m => m.SystemMetricsComponent) 
      },
      { 
        path: 'analytics', 
        loadComponent: () => import('./features/admin/usage-analytics/usage-analytics.component').then(m => m.UsageAnalyticsComponent) 
      },
      { 
        path: 'settings/encryption', 
        loadComponent: () => import('./features/settings/encryption/encryption-settings.component').then(m => m.EncryptionSettingsComponent) 
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];

