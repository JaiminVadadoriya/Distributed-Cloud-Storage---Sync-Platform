# Modern Editorial Design System

This document outlines the visual rules and UX guidelines for the Cloud Storage application. The aesthetic is "Modern Editorial"—a sophisticated evolution of technical minimalist styles, balancing high-contrast brutalist borders with modern spacing, refined typography, and full mobile-first responsiveness.

## 1. Color Palette

The UI uses a high-contrast system with semantic clarity, supporting both Light and Dark modes.

### Core Variables (`styles.css`)
- `--editorial-bg`: Primary background.
  - **Light**: `#F9F7F4` (Clean paper off-white)
  - **Dark**: `#0F0F0F` (True dark-near-black)
- `--editorial-text`: Primary text.
  - **Light**: `#121212` (Rich black)
  - **Dark**: `#F1EEE9` (Warm off-white)
- `--editorial-accent`: Primary brand interaction.
  - `#6366f1` (Indigo 500)

### Action Colors
- **Primary**: Variable based on mode (typically inverse of BG).
- **Critical**: `#e11d48` (Rose 600).
- **Success**: `#10b981` (Emerald 500).

---

## 2. Typography

We use a "Documentary Scale" that prioritizes legibility while maintaining a technical feel.

### Primary Font (UI, Body)
- **Family**: `Inter` / `System-UI`
- **Weight**: 400 (Regular), 600 (Semibold), 800 (Bold)
- **Base Size**: 14px (`text-sm`) for better readability on mobile.

### Secondary Font (Data, Labels, Status)
- **Family**: `Roboto Mono`
- **Usage**: Metadata, technical readouts, button labels, navigation.
- **Modifiers**:
  - **Spacing**: `tracking-[0.05em]` to `[0.3em]`.
  - **Case**: Typically `uppercase` for small technical labels (8px-11px).

---

## 3. Layout & Grid

The redesign adheres to a strict 8px (4px subdivision) spacing system.

- **Grid**: Use a 12-column grid for desktop and a 4-column grid for mobile.
- **Corner Radius**: 
  - **Primary**: `rounded-none` (0px) for high-level structural containers.
  - **Subtle**: `rounded-sm` (2px) or `rounded-md` (4px) for interactive elements (buttons, cards) to signify "clickability."
- **Borders**: Continuous 1px borders using `border-editorial-text/15`.
- **Depth**: Soft, sharp-edged shadows (`shadow-brutalist` or subtle layering) replace purely 2D layouts where depth aids hierarchy.

---

## 4. Components

### Navigation (Mobile-First)
- **Desktop**: Persistent side navigation (240px) or compact icon bar (64px).
- **Mobile**: Collapsible bottom navigation or hidden drawer via hamburger trigger.

### Interactions
- **Hover**: Immediate feedback using background shifts (`bg-editorial-text/5`) or scale tweaks (`scale-[1.01]`).
- **Active**: Press-down effect (`scale-[0.98]`).
- **Loading**: Use technical progress bars `[||||||____]` and skeleton loaders that mirror list structure.

---

## 5. Accessibility (WCAG 2.1+)

1. **Contrast**: Minimum 4.5:1 ratio for all body text.
2. **Text Size**: Avoid text smaller than 12px for primary content. Technical metadata may use 9px-11px but must be high contrast.
3. **Focus States**: Explicit 2px solid offset rings for keyboard navigation.
4. **Touch Targets**: Minimum 44x44px for mobile interactions.

---

## Summary Checklist
1. Is it responsive? Test from 320px to 2560px.
2. Is the hierarchy clear? Use weight and size, not just uppercase.
3. Does it feel "Premium Editorial"? (Clean, fast, technically precise).

