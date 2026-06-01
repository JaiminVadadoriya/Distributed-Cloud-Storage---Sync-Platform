import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { NotificationToastComponent } from './shared/components/notification-toast/notification-toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('CloudStorage.Client');
  protected readonly navAnnouncement = signal('');
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const pageTitle = this.titleService.getTitle() || 'Cloud Storage';
      this.navAnnouncement.set(`Navigated to ${pageTitle}`);

      // Manage focus for accessibility: move focus to first h1 or main container
      setTimeout(() => {
        const target = document.querySelector('h1') || document.querySelector('[role="main"]') || document.querySelector('main');
        if (target) {
          (target as HTMLElement).setAttribute('tabindex', '-1');
          (target as HTMLElement).focus();
        }
      }, 100);
    });
  }
}
