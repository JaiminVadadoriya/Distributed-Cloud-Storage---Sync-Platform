import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section class="space-y-12">
        <header class="pb-4 border-b border-editorial-text/20">
          <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">01. Visual_Environment</h2>
        </header>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          @for (theme of themes; track theme.id) {
            <button (click)="activeTheme.set(theme.id)"
              class="group relative aspect-video p-6 border transition-all flex flex-col justify-end text-left overflow-hidden"
              [class]="activeTheme() === theme.id ? 'border-editorial-text bg-editorial-text text-editorial-bg' : 'border-editorial-text/10 hover:border-editorial-text/40 text-editorial-text'">
              <div class="absolute inset-0 opacity-[0.03] grain-overlay"></div>
              <div class="relative z-10 space-y-2">
                <span class="font-mono text-[9px] uppercase tracking-[0.3em] opacity-40 group-hover:opacity-100 transition-opacity">Mode_Selected</span>
                <h3 class="font-sans text-xl font-bold uppercase tracking-tight">{{ theme.label }}</h3>
              </div>
              @if (activeTheme() === theme.id) {
                <div class="absolute top-4 right-4 w-2 h-2 bg-editorial-bg"></div>
              }
            </button>
          }
        </div>
      </section>

      <section class="space-y-12">
        <header class="pb-4 border-b border-editorial-text/20">
          <h2 class="text-sm font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">02. Interface_Density</h2>
        </header>
        
        <div class="space-y-0 divide-y divide-editorial-text/10 border-y border-editorial-text/10">
          @for (option of densityOptions; track option.id) {
            <div class="flex items-center justify-between py-8 px-4 group hover:bg-editorial-text/[0.01] transition-colors">
              <div class="space-y-1">
                <h4 class="font-sans text-md font-bold uppercase tracking-tight text-editorial-text">{{ option.label }}</h4>
                <p class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/40">{{ option.description }}</p>
              </div>
              <button (click)="activeDensity.set(option.id)"
                class="w-14 h-5 border flex items-center px-0.5 transition-all"
                [class]="activeDensity() === option.id ? 'bg-editorial-text border-editorial-text justify-end' : 'border-editorial-text/20 hover:border-editorial-text/50 bg-transparent'">
                <div class="w-4 h-4 transition-all"
                  [class]="activeDensity() === option.id ? 'bg-editorial-bg' : 'bg-editorial-text/20'"></div>
              </button>
            </div>
          }
        </div>
      </section>

      <footer class="pt-12 opacity-20 group hover:opacity-60 transition-opacity duration-1000 flex justify-between items-center text-[8px] font-mono uppercase tracking-[0.5em]">
        <span>Styles_Synchronized: LATEST</span>
        <div class="h-[1px] flex-1 bg-editorial-text/20 mx-8"></div>
        <span>Config_ID: EA-40-UX</span>
      </footer>
    </div>
  `
})
export class AppearanceSettingsComponent {
  activeTheme = signal<string>('dark');
  activeDensity = signal<string>('premium');

  themes = [
    { id: 'light', label: 'Clinical_White' },
    { id: 'dark', label: 'Deep_Mono' },
    { id: 'glass', label: 'Translucent_Blur' },
  ];

  densityOptions = [
    { id: 'editorial', label: 'Maximal_Whitespace', description: 'Priority: Typography & Focus' },
    { id: 'premium', label: 'Balanced_Entropy', description: 'Standard: Aesthetic Utility' },
    { id: 'compact', label: 'Technical_Density', description: 'Utility: Data Overhead' },
  ];
}
