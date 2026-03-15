import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 text-slate-100">
      <!-- Animated Mesh Gradient Background -->
      <div class="absolute inset-0 z-0">
        <div class="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/30 mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div class="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/30 mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div class="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-fuchsia-500/30 mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000"></div>
      </div>
      
      <!-- Interactive Grid Overlay -->
      <div class="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
      
      <div class="w-full max-w-md p-8 relative z-10 perspective-1000">
        <div class="mb-12 text-center transform transition-all duration-500 hover:scale-105">
             <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-white shadow-2xl shadow-violet-500/50 mx-auto mb-6 transform -rotate-6 hover:rotate-3 transition-transform duration-300 backdrop-blur-md border border-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-lg"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
             </div>
             <h1 class="text-4xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-sm">CloudStorage</h1>
             <p class="text-slate-400 font-medium tracking-wide">Secure, fast, and beautifully distributed.</p>
        </div>
        
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class AuthLayoutComponent {}
