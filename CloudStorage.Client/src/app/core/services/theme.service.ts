import { Injectable, signal, effect } from '@angular/core';

export type AtmosphereTheme = 'clinical' | 'mono' | 'blur';
export type InterfaceDensity = 'maximal' | 'balanced' | 'technical';

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
      root.classList.remove('theme-clinical', 'theme-mono', 'theme-blur', 'dark');
      
      // Apply new theme
      root.classList.add(`theme-${currentTheme}`);
      
      // Mono and Blur both count as 'dark' base for generic components
      if (currentTheme === 'mono' || currentTheme === 'blur') {
        root.classList.add('dark');
      }
      
      localStorage.setItem(this.THEME_KEY, currentTheme);
    });

    // Apply Density side-effects
    effect(() => {
      const currentDensity = this.density();
      const root = document.documentElement;
      
      root.classList.remove('density-maximal', 'density-balanced', 'density-technical');
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
    if (saved && ['clinical', 'mono', 'blur'].includes(saved)) {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'mono' : 'clinical';
  }

  private getInitialDensity(): InterfaceDensity {
    const saved = localStorage.getItem(this.DENSITY_KEY) as InterfaceDensity;
    if (saved && ['maximal', 'balanced', 'technical'].includes(saved)) {
      return saved;
    }
    return 'balanced';
  }
}

