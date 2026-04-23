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
    service.setTheme('mono');
    expect(service.theme()).toBe('mono');
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(localStorage.getItem(THEME_KEY)).toBe('mono');

    service.setTheme('blur');
    expect(service.theme()).toBe('blur');
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(localStorage.getItem(THEME_KEY)).toBe('blur');
  });

  it('should update density and localStorage', async () => {
    service.setDensity('technical');
    expect(service.density()).toBe('technical');
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(localStorage.getItem(DENSITY_KEY)).toBe('technical');
  });

  it('should load initial state from localStorage', () => {
    localStorage.setItem(THEME_KEY, 'blur');
    localStorage.setItem(DENSITY_KEY, 'technical');
    
    runInInjectionContext(injector, () => {
       const newService = new ThemeService();
       expect(newService.theme()).toBe('blur');
       expect(newService.density()).toBe('technical');
    });
  });
});
