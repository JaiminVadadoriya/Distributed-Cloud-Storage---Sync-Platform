# Editorial Minimalist Design System

This document outlines the core visual rules and guidelines for the Cloud Storage application's UI/UX. The aesthetic is "Editorial Minimalist," characterized by high-contrast brutalist borders, monospace technical typography, strict geometry, and variable light/dark mode implementations.

## 1. Color Palette

The entire UI is built on a high-contrast binary system using CSS variables defined in `styles.css` using the Tailwind CSS v4 `@theme` block or root variables.

### Core Variables (`styles.css`)
- `--editorial-bg`: The primary background color.
  - **Light Mode**: `#F1EEE9` (Warm off-white, paper-like)
  - **Dark Mode**: `#1A1A1A` (Deep near-black)
- `--editorial-text`: The primary foreground color.
  - **Light Mode**: `#1A1A1A` (Soft black)
  - **Dark Mode**: `#F1EEE9` (Warm off-white)

### Semantic Colors
- **Danger / Critical**: `#e11d48` (Rose 600) / Red. Used for irreversible actions (e.g., Purge Drive).
- **Subdued / Secondary Text**: Use opacity modifiers or specific colors.
  - **CRITICAL**: Never use opacities below **50%** for text elements to ensure accessibility compliance.
  - Recommended: `text-editorial-text/70` for secondary labels, `text-editorial-text/60` for metadata.

---

## 2. Typography

The design relies exclusively on two main font families, strictly enforcing a technical and documentary feel.

### Primary Font (Headings, Body text)
- **Family**: `Inter` / `Roboto` / sans-serif
- **Usage**: Main headings, page titles, body paragraphs.
- **Classes**: `font-sans font-bold tracking-tighter`

### Secondary Font (Labels, Data, Navigation, UI Elements)
- **Family**: `Roboto Mono` / `Space Mono` / monospace
- **Usage**: Forms, buttons, table data, timestamps, system statuses, navigation items.
- **Modifiers**:
  - **Uppercase**: Almost all mono text should be `uppercase`.
  - **Extreme Tracking**: Use `tracking-widest` or custom `tracking-[0.2em]` to `[0.5em]` for a spaced-out, technical look.
  - **Sizing**: Keep mono text small (e.g., `text-[9px]`, `text-[10px]`, `text-[11px]`).

---

## 3. Layout & Geometry

The design completely avoids rounded corners and soft shadows to maintain a brutalist, print-like aesthetic.

- **Border Radius**: Always `0` (`rounded-none`). No soft radii anywhere.
- **Borders**: Sharp 1px solid borders.
  - Main structural dividers: `border-editorial-text/20`.
  - Subtle separators: `border-editorial-text/10`.
- **Shadows**: Avoid soft, blurry drop shadows. If depth is needed, use sharp, hard-edged offsets (e.g., brutalist shadows) or stick to flat 2D overlapping div borders.
- **Glassmorphism**: **FORBIDDEN**. Do not use `backdrop-blur` or semi-transparent glowing overlays. Modals and overlays should be solid colors (`bg-editorial-bg`) with high-contrast borders and dim solid backdrops (`bg-editorial-text/20`).

---

## 4. Components

### Primary Buttons (Call to Action)
- **Background**: Solid primary text color (`bg-editorial-text`).
- **Foreground**: Solid primary background color (`text-editorial-bg`).
- **Typography**: Mono, uppercase, small text, wide tracking.
- **Interaction**: `hover:opacity-90 active:scale-[0.99] transition-all`.
- **Disabled State**: `disabled:opacity-50 disabled:cursor-not-allowed`.

### Secondary Buttons & Controls
- **Style**: Transparent with full or partial borders (`border border-editorial-text/20`).
- **Interaction**: `hover:bg-editorial-text hover:text-editorial-bg transition-colors`.

### Inputs & Forms
- **Container**: `bg-transparent` with only a bottom border (`border-b border-editorial-text/20`). No full surrounding box.
- **Focus State**: `focus:border-editorial-text outline-none transition-all`.
- **Text**: Monospace, uppercase.

### Tables / Lists (Data Display)
- **Structure**: Avoid traditional `<table>` elements. Use CSS Grid (e.g., `grid-cols-[40px_1fr_100px_150px]`) for strict alignment.
- **Separators**: `border-b border-editorial-text/20` between rows.
- **Hover Effects**: Reveal actions (download, delete) on row hover using `opacity-0 group-hover:opacity-100`.

---

## 5. Micro-Interactions

- **Hover States**: Subtle but immediate. Avoid long transitions unless it's a structural layout shift. Use `<div class="w-1.5 h-1.5 rounded-full bg-editorial-text/20 group-hover:bg-editorial-text/60 transition-none"></div>` for terminal-like active indicators.
- **Loading States**: Use brutalist placeholders like `[____]` or `--- KB` rather than generic spinning loaders. If using pulse animations, style them to look like terminal enumeration blocks (e.g., `ENUMERATING_OBJECT_1...`).

---

## Summary Checklist for New UI Additions:
1. Is the text readable? **Strictly avoid** opacities below **50%** for any text.
2. Are corners completely sharp? No `rounded` classes (use `rounded-none`).
3. Is technical information using the `.font-mono` class?
4. Are borders visible? Use `border-editorial-text/20` as the standard.
5. Does it work in both light and dark mode automatically via CSS variables?
