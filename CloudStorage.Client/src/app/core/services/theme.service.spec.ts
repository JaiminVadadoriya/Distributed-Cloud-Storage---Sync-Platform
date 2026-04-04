import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { Injector, runInInjectionContext } from '@angular/core';

describe('ThemeService', () => {
  let service: ThemeService;
  let injector: Injector;
  const THEME_KEY = 'cloud-storage-theme';

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    TestBed.configureTestingModule({
      providers: [ThemeService]
    });
    
    service = TestBed.inject(ThemeService);
    injector = TestBed.inject(Injector);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should toggle theme state', () => {
    const initial = service.isDarkMode();
    service.toggleTheme();
    expect(service.isDarkMode()).toBe(!initial);
  });

  it('should update theme signal and localStorage', async () => {
    service.isDarkMode.set(true);
    expect(service.isDarkMode()).toBe(true);
    
    // In Angular testing, effects for services may require a microtask flush
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    service.isDarkMode.set(false);
    expect(service.isDarkMode()).toBe(false);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('should load initial theme from localStorage', () => {
    // Set item BEFORE creating service
    localStorage.setItem(THEME_KEY, 'dark');
    
    runInInjectionContext(injector, () => {
       // Manual instantiation within injection context to allow effect() calls
       const darkService = new ThemeService();
       expect(darkService.isDarkMode()).toBe(true);
    });
  });
});
