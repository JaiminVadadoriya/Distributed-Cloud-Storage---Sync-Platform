import { Component, ElementRef, HostListener, OnInit, viewChild, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';

interface CommandItem {
  id: string;
  name: string;
  category: 'Actions' | 'Navigation';
  shortcut?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div class="fixed inset-0 z-[300] bg-editorial-bg/75 backdrop-blur-md flex items-start justify-center p-6 sm:p-24 animate-in-fade"
           (click)="close()">
        <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
        <div class="w-full max-w-2xl border-4 border-editorial-text bg-editorial-bg shadow-brutalist overflow-hidden flex flex-col h-[400px] relative"
             (click)="$event.stopPropagation()">
          
          <!-- Subtle technical grid -->
          <div class="absolute inset-0 tech-grid pointer-events-none opacity-[0.03]"></div>
          
          <!-- Search Header -->
          <div class="flex items-center border-b-2 border-editorial-text p-4 relative z-10">
            <svg class="text-editorial-text/40 mr-3 shrink-0" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input #queryInput
                   type="text" 
                   [value]="searchQuery()"
                   (input)="onSearchInput($event)"
                   placeholder="Type a command or search files..."
                   class="w-full bg-transparent outline-none font-mono text-xs uppercase tracking-widest text-editorial-text placeholder:text-editorial-text/20"
                   aria-label="Search command palette">
          </div>

          <!-- Items List -->
          <div class="flex-1 overflow-y-auto p-4 space-y-6 relative z-10">
            @if (categories().length === 0) {
              <div class="py-12 text-center">
                <p class="font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/20">No matching commands found.</p>
              </div>
            } @else {
              @for (category of categories(); track category) {
                <div class="space-y-2">
                  <span class="text-[9px] font-mono font-bold uppercase tracking-[0.4em] text-editorial-text/30 px-3">{{ category }}</span>
                  <div class="space-y-1 flex flex-col items-stretch">
                    @for (item of filteredByCategory(category); track item.id) {
                      <button [class.bg-editorial-text]="isSelected(item)"
                              [class.text-editorial-bg]="isSelected(item)"
                              (click)="executeItem(item)"
                              (mouseenter)="setSelectedItem(item)"
                              type="button"
                              class="w-full flex items-center justify-between p-3 font-mono text-[10px] uppercase tracking-wider cursor-pointer transition-colors border border-transparent hover:border-editorial-text/10 text-left bg-transparent border-none">
                        <span>{{ item.name }}</span>
                        @if (item.shortcut) {
                          <span class="text-[8px] opacity-60 border border-current px-1.5 py-0.5 rounded-sm">{{ item.shortcut }}</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>
    }
  `
})
export class CommandPaletteComponent implements OnInit {
  private router = inject(Router);
  private layoutService = inject(LayoutService);

  isOpen = signal(false);
  searchQuery = signal('');
  selectedIndex = signal(0);
  items = signal<CommandItem[]>([]);

  queryInput = viewChild<ElementRef<HTMLInputElement>>('queryInput');

  ngOnInit() {
    this.initializeCommands();
  }

  @HostListener('window:keydown.meta.k', ['$event'])
  @HostListener('window:keydown.control.k', ['$event'])
  onTogglePalette(event: Event) {
    event.preventDefault();
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      this.searchQuery.set('');
      this.selectedIndex.set(0);
      setTimeout(() => this.queryInput()?.nativeElement.focus(), 100);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.isOpen()) return;
    
    const flat = this.flatFilteredItems();
    if (flat.length === 0) return;

    if (event.key === 'Escape') {
      this.close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update(i => (i + 1) % flat.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => (i - 1 + flat.length) % flat.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const current = flat[this.selectedIndex()];
      if (current) this.executeItem(current);
    }
  }

  private initializeCommands() {
    this.items.set([
      { id: 'nav-dash', name: 'Go to Dashboard', category: 'Navigation', shortcut: '⌘D', action: () => this.router.navigate(['/dashboard']) },
      { id: 'nav-shared', name: 'Go to Shared Folders', category: 'Navigation', shortcut: '⌘S', action: () => this.router.navigate(['/shared']) },
      { id: 'nav-trash', name: 'Go to Trash Bin', category: 'Navigation', shortcut: '⌘T', action: () => this.router.navigate(['/trash']) },
      { id: 'nav-settings', name: 'Go to Settings', category: 'Navigation', shortcut: '⌘I', action: () => this.router.navigate(['/settings']) },
      { id: 'action-folder', name: 'Create New Folder', category: 'Actions', shortcut: 'N F', action: () => this.layoutService.triggerNewFolder() },
      { id: 'action-upload', name: 'Upload New File', category: 'Actions', shortcut: 'U F', action: () => this.layoutService.triggerGlobalUpload() }
    ]);
  }

  flatFilteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.items().filter(item => item.name.toLowerCase().includes(q));
  });

  categories = computed(() => {
    return Array.from(new Set(this.flatFilteredItems().map(item => item.category)));
  });

  filteredByCategory(category: string) {
    return this.flatFilteredItems().filter(item => item.category === category);
  }

  isSelected(item: CommandItem) {
    const flat = this.flatFilteredItems();
    return flat.indexOf(item) === this.selectedIndex();
  }

  setSelectedItem(item: CommandItem) {
    const flat = this.flatFilteredItems();
    const idx = flat.indexOf(item);
    if (idx !== -1) {
      this.selectedIndex.set(idx);
    }
  }

  onSearchInput(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.selectedIndex.set(0);
  }

  executeItem(item: CommandItem) {
    item.action();
    this.close();
  }

  close() {
    this.isOpen.set(false);
  }
}
