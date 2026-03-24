import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';
import { AuthLayoutComponent } from './core/layout/auth-layout/auth-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { FileListComponent } from './features/dashboard/file-list/file-list.component';
import { SharedWithMeComponent } from './features/files/shared-with-me/shared-with-me.component';
import { ActivityComponent } from './features/activity/activity.component';
import { DevicesComponent } from './features/devices/devices.component';
import { SettingsComponent } from './features/settings/settings.component';
import { SearchResultsComponent } from './features/search/search-results/search-results.component';
import { TrashComponent } from './features/files/trash/trash.component';
import { RecentComponent } from './features/files/recent/recent.component';
import { FilePreviewComponent } from './features/files/file-preview/file-preview.component';
import { ConflictCenterComponent } from './features/sync/conflict-center/conflict-center.component';
import { SyncHistoryComponent } from './features/sync/sync-history/sync-history.component';
import { AuditLogComponent } from './features/activity/audit-log/audit-log.component';
import { SystemMetricsComponent } from './features/admin/system-metrics/system-metrics.component';
import { UsageAnalyticsComponent } from './features/admin/usage-analytics/usage-analytics.component';
import { EncryptionSettingsComponent } from './features/settings/encryption/encryption-settings.component';

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
      { path: 'dashboard', component: DashboardComponent },
      { path: 'files', component: FileListComponent },
      { path: 'shared', component: SharedWithMeComponent },
      { path: 'recent', component: RecentComponent },
      { path: 'activity', component: ActivityComponent },
      { path: 'devices', component: DevicesComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'search', component: SearchResultsComponent },
      { path: 'trash', component: TrashComponent },
      { path: 'preview/:id', component: FilePreviewComponent },
      { path: 'conflicts', component: ConflictCenterComponent },
      { path: 'sync-history', component: SyncHistoryComponent },
      { path: 'audit-log', component: AuditLogComponent },
      { path: 'system-metrics', component: SystemMetricsComponent },
      { path: 'analytics', component: UsageAnalyticsComponent },
      { path: 'settings/encryption', component: EncryptionSettingsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];

