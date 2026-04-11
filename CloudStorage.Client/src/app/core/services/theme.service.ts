import { Injectable, signal, effect } from '@angular/core';

export type AtmosphereTheme = 'light' | 'dark' | 'glass';
export type InterfaceDensity = 'editorial' | 'premium' | 'compact';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'cloud-storage-atmosphere';
  private readonly DENSITY_KEY = 'cloud-storage-density';

  // State Signals
  theme = signal<AtmosphereTheme>(this.getInitialTheme());
  density = signal<InterfaceDensity>(this.getInitialDensity());

  constructor() {
    // Apply Theme side-effects
    effect(() => {
      const currentTheme = this.theme();
      const root = document.documentElement;
      
      // Clean up old classes
      root.classList.remove('theme-light', 'theme-dark', 'theme-glass', 'dark');
      
      // Apply new theme
      root.classList.add(`theme-${currentTheme}`);
      if (currentTheme === 'dark' || currentTheme === 'glass') {
        root.classList.add('dark');
      }
      
      localStorage.setItem(this.THEME_KEY, currentTheme);
    });

    // Apply Density side-effects
    effect(() => {
      const currentDensity = this.density();
      const root = document.documentElement;
      
      root.classList.remove('density-editorial', 'density-premium', 'density-compact');
      root.classList.add(`density-${currentDensity}`);
      
      localStorage.setItem(this.DENSITY_KEY, currentDensity);
    });
  }

  setTheme(newTheme: AtmosphereTheme) {
    this.theme.set(newTheme);
  }

  setDensity(newDensity: InterfaceDensity) {
    this.density.set(newDensity);
  }

  private getInitialTheme(): AtmosphereTheme {
    const saved = localStorage.getItem(this.THEME_KEY) as AtmosphereTheme;
    if (saved && ['light', 'dark', 'glass'].includes(saved)) {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private getInitialDensity(): InterfaceDensity {
    const saved = localStorage.getItem(this.DENSITY_KEY) as InterfaceDensity;
    if (saved && ['editorial', 'premium', 'compact'].includes(saved)) {
      return saved;
    }
    return 'premium';
  }
}
