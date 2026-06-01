import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { FileListComponent } from './file-list/file-list.component';
import { SettingsComponent } from '../settings/settings.component';

export const DASHBOARD_ROUTES: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'files', component: FileListComponent }, 
  { path: 'shared', component: FileListComponent }, 
  { path: 'settings', component: SettingsComponent } 
];
