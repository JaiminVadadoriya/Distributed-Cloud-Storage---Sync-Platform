import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, AtmosphereTheme, InterfaceDensity } from '../../../core/services/theme.service';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-24 animate-in-fade-up">
      <!-- 01. Visual_Environment -->
      <section class="space-y-16">
        <header class="flex items-end gap-6">
          <span class="font-mono text-xs font-bold tracking-[0.3em] text-editorial-text">01.</span>
          <h2 class="text-xs font-mono font-bold uppercase tracking-[0.5em] text-editorial-text/40">Visual_Environment</h2>
          <div class="h-[1px] flex-1 bg-editorial-text/10 mb-1.5"></div>
        </header>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          @for (theme of themes; track theme.id) {
            <button (click)="themeService.setTheme(theme.id)"
              class="group relative aspect-[1.8/1] p-10 border transition-all flex flex-col justify-end text-left overflow-hidden active:scale-[0.98]"
              [class]="themeService.theme() === theme.id ? 
                (theme.id === 'clinical' ? 'border-editorial-text bg-editorial-text/[0.03]' : 
                 theme.id === 'mono' ? 'border-editorial-text bg-editorial-text text-editorial-bg' : 
                 'border-editorial-text bg-editorial-text/5 backdrop-blur-xl outline outline-2 outline-editorial-text') : 
                'border-editorial-text/10 hover:border-editorial-text/40 text-editorial-text'">
              
              <div class="relative z-10 space-y-4">
                <span class="font-mono text-[8px] uppercase tracking-[0.4em] opacity-30 group-hover:opacity-100 transition-opacity">Mode_Selected</span>
                <h3 class="font-sans text-2xl font-black uppercase tracking-tighter leading-none italic">{{ theme.label }}</h3>
              </div>
              
              @if (themeService.theme() === theme.id) {
                <div class="absolute top-6 right-6 w-3 h-3 transition-transform duration-500 animate-in-scale"
                     [class]="theme.id === 'mono' ? 'bg-editorial-bg' : 'bg-editorial-text'"></div>
              }
              
              <!-- Background pattern for specific themes -->
              @if (theme.id === 'blur') {
                <div class="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] bg-[size:20px_20px]"></div>
              }
            </button>
          }
        </div>
      </section>

      <!-- 02. Interface_Density -->
      <section class="space-y-16">
        <header class="flex items-end gap-6">
          <span class="font-mono text-xs font-bold tracking-[0.3em] text-editorial-text">02.</span>
          <h2 class="text-xs font-mono font-bold uppercase tracking-[0.5em] text-editorial-text/40">Interface_Density</h2>
          <div class="h-[1px] flex-1 bg-editorial-text/10 mb-1.5"></div>
        </header>
        
        <div class="space-y-0 border-y border-editorial-text/10">
          @for (option of densityOptions; track option.id) {
            <div class="flex items-center justify-between py-10 px-6 group hover:bg-editorial-text/[0.01] transition-all cursor-default">
              <div class="space-y-2">
                <h4 class="font-sans text-lg font-black uppercase tracking-tight text-editorial-text group-hover:translate-x-1 transition-transform">{{ option.label }}</h4>
                <p class="font-mono text-[9px] uppercase tracking-[0.25em] text-editorial-text/40 font-bold italic">{{ option.description }}</p>
              </div>
              
              <button (click)="themeService.setDensity(option.id)"
                class="w-16 h-6 border-2 flex items-center p-0.5 transition-all relative group/switch focus:outline-none"
                [class]="themeService.density() === option.id ? 'bg-editorial-text border-editorial-text justify-end' : 'border-editorial-text/20 hover:border-editorial-text/50 bg-transparent'">
                <div class="w-4 h-4 transition-all duration-300 shadow-sm"
                  [class]="themeService.density() === option.id ? 'bg-editorial-bg' : 'bg-editorial-text/20 group-hover/switch:bg-editorial-text/40'"></div>
              </button>
            </div>
          }
        </div>
      </section>

      <footer class="pt-16 border-t border-editorial-text/5 flex justify-between items-center text-[8px] font-mono uppercase tracking-[0.6em] opacity-20">
        <div class="flex gap-10">
          <span>Atmosphere_Node: ONLINE</span>
          <span>Latency: 4ms</span>
        </div>
        <span class="font-bold">© 2026_VOID_CORE</span>
      </footer>
    </div>
  `
})
export class AppearanceSettingsComponent {
  themeService = inject(ThemeService);

  themes: { id: AtmosphereTheme; label: string }[] = [
    { id: 'clinical', label: 'Clinical_White' },
    { id: 'mono', label: 'Deep_Mono' },
    { id: 'blur', label: 'Translucent_Blur' },
  ];

  densityOptions: { id: InterfaceDensity; label: string; description: string }[] = [
    { id: 'maximal', label: 'Maximal_Whitespace', description: 'Priority: Typography & Focus' },
    { id: 'balanced', label: 'Balanced_Entropy', description: 'Standard: Aesthetic Utility' },
    { id: 'technical', label: 'Technical_Density', description: 'Utility: Data Overhead' },
  ];

}
