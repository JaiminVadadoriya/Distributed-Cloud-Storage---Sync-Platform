import { Injectable, signal, computed } from '@angular/core';
import { SearchFilter } from '../models/file.model';

/**
 * SearchService manages the global search query state with advanced filtering.
 */
@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly _query = signal<string>('');
  public readonly query = this._query.asReadonly();

  private readonly _filters = signal<Partial<SearchFilter>>({});
  public readonly filters = this._filters.asReadonly();

  private readonly _suggestions = signal<string[]>([]);
  public readonly suggestions = this._suggestions.asReadonly();

  private readonly _searchHistory = signal<string[]>([]);
  public readonly searchHistory = this._searchHistory.asReadonly();

  public readonly hasActiveFilters = computed(() => {
    const f = this._filters();
    return !!(f.fileType || f.dateFrom || f.dateTo || f.owner);
  });

  public updateQuery(value: string): void {
    this._query.set(value.trim().toLowerCase());
    if (value.length > 1) {
      this.updateSuggestions(value);
    } else {
      this._suggestions.set([]);
    }
  }

  public updateFilters(filters: Partial<SearchFilter>): void {
    this._filters.update(current => ({ ...current, ...filters }));
  }

  public clearFilters(): void {
    this._filters.set({});
  }

  public addToHistory(query: string): void {
    if (!query.trim()) return;
    this._searchHistory.update(h => [query, ...h.filter(q => q !== query)].slice(0, 10));
  }

  private updateSuggestions(query: string): void {
    // Mock suggestions from history
    const matches = this._searchHistory().filter(h =>
      h.toLowerCase().includes(query.toLowerCase())
    );
    this._suggestions.set(matches.slice(0, 5));
  }
}

