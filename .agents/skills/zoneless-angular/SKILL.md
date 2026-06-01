# Zoneless Angular Writing Skill

This skill provides guidelines and best practices for writing Angular applications without `zone.js` (Zoneless).

## Goal
Ensure the application remains performant, lightweight, and predictable by adhering to zoneless change detection principles.

## Core Principles

1.  **NO ZoneJS**: `zone.js` must not be a dependency. `provideZonelessChangeDetection()` must be used in `app.config.ts`.
2.  **Signals First**: State should be managed using Angular Signals (`signal`, `computed`, `effect`). Signals automatically notify Angular when change detection needs to run.
3.  **OnPush Strategy**: All components should use `ChangeDetectionStrategy.OnPush`.
4.  **Async Pipe**: Use the `| async` pipe in templates when dealing with Observables, as it calls `markForCheck()` automatically.
5.  **Explicit Notifications**: If updating state outside of Signals or AsyncPipe, use `ChangeDetectorRef.markForCheck()`.

## Testing Best Practices

1.  **fixture.whenStable()**: Use `await fixture.whenStable()` instead of `fixture.detectChanges()` to wait for asynchronous state changes to settle.
2.  **Avoid detectChanges()**: Manual `fixture.detectChanges()` should be avoided unless absolutely necessary for forcing a synchronous render in a test environment.
3.  **No NgZone**: Do not use `NgZone.run()` or `NgZone.runOutsideAngular()` in application code as they are redundant or ineffective in zoneless mode.

## Implementation Guide

### Component Definition
```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule],
  template: `<div>{{ name() }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyComponent {
  name = signal('Angular 21');
}
```

### Bootstrap Config
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    // ... other providers
  ]
};
```

### Test Setup
```typescript
it('should update UI when signal changes', async () => {
  component.name.set('New Name');
  await fixture.whenStable(); // Allow zoneless detection to catch up
  const element = fixture.nativeElement.querySelector('div');
  expect(element.textContent).toBe('New Name');
});
```

## Modern Animations (animate.enter & animate.leave)

> [!IMPORTANT]
> **The `@angular/animations` package is now deprecated.** The Angular team recommends using native CSS with `animate.enter` and `animate.leave` for all new code. This approach avoids the overhead of the animations DSL and produces smaller bundles.

Angular 21+ supports compiler-native attributes for animations that are more performant than legacy `@angular/animations`.

### Core Rules
1.  **NO Legacy Mix**: Do not use `animations: [...]` in the `@Component` decorator if using `animate.enter/leave`.
2.  **Attribute Syntax**: Use `animate.enter="css-class"` and `animate.leave="css-class"`.
3.  **CSS Transitions & keyframes**: Prefer keyframe animations for entry/exit sequences.
4.  **@starting-style**: Use for "from" states in CSS transitions to ensure smooth entry.
5.  **Manual Completion**: If using JS-driven animations via event binding, you MUST call `$event.animationComplete()`.

### Example (CSS Keyframes)
```html
<div animate.enter="fade-in" animate.leave="fade-out" *ngIf="isShown()">
  Interactive Element
</div>
```

```css
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fade-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

.fade-in { animation: fade-in 300ms ease-out forwards; }
.fade-out { animation: fade-out 250ms ease-in forwards; }
```

### Testing Animations
In `TestBed`, enable animations explicitly if verifying visual states:
```typescript
TestBed.configureTestingModule({ 
  animationsEnabled: true 
});
```
