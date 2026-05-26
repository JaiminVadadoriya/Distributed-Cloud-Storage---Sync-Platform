import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { LayoutService } from '../../services/layout.service';
import { SearchService } from '../../services/search.service';
import { ThemeService, AtmosphereTheme, InterfaceDensity } from '../../services/theme.service';
import { BaseComponent } from '../../models/base-component';

/**
 * TopbarComponent handles the global search, notifications, and atmosphere management.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
  styles: [`
    @keyframes dropdown-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes dropdown-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-5px); }
    }
    .animate-dropdown-enter { animation: dropdown-in 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-dropdown-leave { animation: dropdown-out 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `]
})
export class TopbarComponent extends BaseComponent {
  public authService = inject(AuthService);
  public layoutService = inject(LayoutService);
  public themeService = inject(ThemeService);
  public searchService = inject(SearchService);
  public notificationService = inject(NotificationService);
  private router = inject(Router);

  public showAtmosphereMenu = false;
  public showMobileSearch = signal<boolean>(false);

  public toggleMobileSearch(): void {
    this.showMobileSearch.update(v => !v);
  }

  public toggleAtmosphereMenu(): void {
    this.showAtmosphereMenu = !this.showAtmosphereMenu;
    if (this.showAtmosphereMenu) {
      this.layoutService.closeAllOverlays();
    }
  }

  public setAtmosphere(theme: AtmosphereTheme): void {
    this.themeService.setTheme(theme);
    this.showAtmosphereMenu = false;
  }

  public setDensity(density: InterfaceDensity): void {
    this.themeService.setDensity(density);
    this.showAtmosphereMenu = false;
  }

  public toggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }

  public onSearch(query: string): void {
    this.searchService.updateQuery(query);
  }

  public navigateToSearch(query: string): void {
    if (query.trim()) {
      this.searchService.addToHistory(query.trim());
      this.router.navigate(['/search'], { queryParams: { q: query.trim() } });
    }
  }

  public openUpload(): void {
    this.layoutService.triggerGlobalUpload();
  }

  public logout(): void {
    this.layoutService.closeProfileMenu();
    this.authService.logout();
    this.notificationService.info('SESSION_TERMINATED: Securely logged out.');
    this.router.navigate(['/auth/login']);
  }

  public getUserInitial(): string {
    const user = this.authService.currentUser();
    return user?.username?.charAt(0)?.toUpperCase() || 'U';
  }

  public getUserName(): string {
    const user = this.authService.currentUser();
    return user?.username || 'User';
  }
}

