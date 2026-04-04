import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SearchService]
    });
    service = TestBed.inject(SearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update query and normalize to lowercase', () => {
    service.updateQuery(' TEST ');
    expect(service.query()).toBe('test');
  });

  it('should update and clear filters', () => {
    service.updateFilters({ fileType: 'pdf' });
    expect(service.filters().fileType).toBe('pdf');
    expect(service.hasActiveFilters()).toBe(true);

    service.clearFilters();
    expect(service.filters()).toEqual({});
    expect(service.hasActiveFilters()).toBe(false);
  });

  it('should manage search history', () => {
    service.addToHistory('angular');
    service.addToHistory('react');
    service.addToHistory('angular'); // Duplicate should move to top

    expect(service.searchHistory()[0]).toBe('angular');
    expect(service.searchHistory()[1]).toBe('react');
    expect(service.searchHistory().length).toBe(2);
  });

  it('should provide suggestions from history', () => {
    service.addToHistory('angular basics');
    service.addToHistory('angular signals');
    service.addToHistory('react hooks');

    service.updateQuery('ang');
    expect(service.suggestions()).toContain('angular basics');
    expect(service.suggestions()).toContain('angular signals');
    expect(service.suggestions()).not.toContain('react hooks');
  });
});
