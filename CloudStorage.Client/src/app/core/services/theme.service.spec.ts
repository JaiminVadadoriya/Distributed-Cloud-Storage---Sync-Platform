import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { Injector, runInInjectionContext } from '@angular/core';

describe('ThemeService', () => {
  let service: ThemeService;
  let injector: Injector;
  const THEME_KEY = 'cloud-storage-atmosphere';
  const DENSITY_KEY = 'cloud-storage-density';

  beforeEach(() => {
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

  it('should update theme and localStorage', async () => {
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    service.setTheme('glass');
    expect(service.theme()).toBe('glass');
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(localStorage.getItem(THEME_KEY)).toBe('glass');
  });

  it('should update density and localStorage', async () => {
    service.setDensity('compact');
    expect(service.density()).toBe('compact');
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(localStorage.getItem(DENSITY_KEY)).toBe('compact');
  });

  it('should load initial state from localStorage', () => {
    localStorage.setItem(THEME_KEY, 'glass');
    localStorage.setItem(DENSITY_KEY, 'editorial');
    
    runInInjectionContext(injector, () => {
       const newService = new ThemeService();
       expect(newService.theme()).toBe('glass');
       expect(newService.density()).toBe('editorial');
    });
  });
});
