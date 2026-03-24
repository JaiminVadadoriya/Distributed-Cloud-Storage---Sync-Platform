import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

/**
 * AuthLayoutComponent provides the visual context for authentication 
 * flows, featuring high-contrast editorial aesthetics and mood lighting.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css'
})
export class AuthLayoutComponent {
  public themeService = inject(ThemeService);
}
