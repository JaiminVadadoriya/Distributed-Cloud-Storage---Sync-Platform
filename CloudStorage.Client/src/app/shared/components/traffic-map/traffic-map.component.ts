import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TrafficNode {
  id: number;
  x: number;
  y: number;
  intensity: number;
}

@Component({
  selector: 'app-traffic-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full aspect-[2/1] bg-editorial-text/[0.02] border border-editorial-text/5 overflow-hidden group">
      <!-- Grid Overlay -->
      <div class="absolute inset-0 grid-overlay opacity-20 pointer-events-none"></div>
      
      <!-- Label -->
      <div class="absolute top-4 left-4 font-mono text-[8px] uppercase tracking-[0.4em] text-editorial-text/30 z-10 italic">
        Geographic_Load_Distribution / Realtime
      </div>
      
      <!-- Dots -->
      <svg class="absolute inset-0 w-full h-full p-8" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
        <!-- Connecting lines (subtle) -->
        @for (link of connections(); track $index) {
          <line
            [attr.x1]="link.x1" [attr.y1]="link.y1"
            [attr.x2]="link.x2" [attr.y2]="link.y2"
            class="stroke-editorial-text/5" stroke-width="0.5" />
        }
        
        <!-- Data nodes -->
        @for (node of nodes(); track node.id) {
          <g class="transition-transform duration-1000">
            <circle
              [attr.cx]="node.x" [attr.cy]="node.y"
              [attr.r]="node.intensity * 4"
              class="fill-editorial-text animate-pulse"
              [style.opacity]="node.intensity * 0.4" />
            <circle
              [attr.cx]="node.x" [attr.cy]="node.y"
              [attr.r]="1"
              class="fill-editorial-text" />
          </g>
        }
      </svg>
      
      <!-- Legend -->
      <div class="absolute bottom-4 right-4 flex items-center gap-6 font-mono text-[7px] uppercase tracking-widest text-editorial-text/20 z-10">
        <div class="flex items-center gap-2">
           <div class="w-1.5 h-1.5 bg-editorial-text opacity-40 rounded-full"></div>
           <span>Active_Nodes</span>
        </div>
        <div class="flex items-center gap-2">
           <div class="w-1.5 h-1.5 bg-rose-500 opacity-40 rounded-full animate-ping"></div>
           <span>Conflict_Resolved</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid-overlay {
      background-image: linear-gradient(to right, currentColor 1px, transparent 1px),
                        linear-gradient(to bottom, currentColor 1px, transparent 1px);
      background-size: 20px 20px;
    }
  `]
})
export class TrafficMapComponent implements OnInit {
  nodes = signal<TrafficNode[]>([]);
  
  connections = computed(() => {
    const list = this.nodes();
    const result: { x1: number, y1: number, x2: number, y2: number }[] = [];
    for (let i = 0; i < list.length; i++) {
       const near = list.slice(i + 1).filter(n => 
         Math.sqrt(Math.pow(n.x - list[i].x, 2) + Math.pow(n.y - list[i].y, 2)) < 150
       ).slice(0, 2);
       near.forEach(n => result.push({ x1: list[i].x, y1: list[i].y, x2: n.x, y2: n.y }));
    }
    return result;
  });

  ngOnInit() {
    this.generateNodes();
    // Slowly jitter nodes
    setInterval(() => {
      this.nodes.update(ns => ns.map(n => ({
        ...n,
        intensity: Math.max(0.2, Math.min(1, n.intensity + (Math.random() - 0.5) * 0.1)),
        x: n.x + (Math.random() - 0.5) * 2,
        y: n.y + (Math.random() - 0.5) * 2
      } as TrafficNode)));
    }, 2000);
  }

  private generateNodes() {
    const ns: { id: number, x: number, y: number, intensity: number }[] = [];
    // Roughly mimic world continents for "production" feel
    const clusters = [
      { x: 200, y: 150, count: 8 }, // NA
      { x: 300, y: 350, count: 4 }, // SA
      { x: 500, y: 150, count: 12 }, // Europe
      { x: 550, y: 280, count: 5 }, // Africa
      { x: 750, y: 200, count: 15 }, // Asia
      { x: 800, y: 380, count: 3 }  // Aus
    ];

    clusters.forEach(c => {
      for (let i = 0; i < c.count; i++) {
        ns.push({
          id: Math.random(),
          x: c.x + (Math.random() - 0.5) * 150,
          y: c.y + (Math.random() - 0.5) * 100,
          intensity: Math.random()
        });
      }
    });
    this.nodes.set(ns);
  }
}
