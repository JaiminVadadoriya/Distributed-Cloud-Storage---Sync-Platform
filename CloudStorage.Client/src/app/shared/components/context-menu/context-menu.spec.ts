import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContextMenuComponent } from './context-menu.component';
import { LayoutService, ContextMenuItem } from '../../../core/services/layout.service';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';

class MockLayoutService {
  isContextMenuOpen = signal(false);
  contextMenuPosition = signal({ x: 0, y: 0 });
  contextMenuItems = signal<ContextMenuItem[]>([]);

  openContextMenu(x: number, y: number, items: ContextMenuItem[]) {
    this.contextMenuPosition.set({ x, y });
    this.contextMenuItems.set(items);
    this.isContextMenuOpen.set(true);
  }

  closeContextMenu() {
    this.isContextMenuOpen.set(false);
  }
}

describe('ContextMenuComponent', () => {
  let component: ContextMenuComponent;
  let fixture: ComponentFixture<ContextMenuComponent>;
  let layoutService: MockLayoutService;

  const mockItems: ContextMenuItem[] = [
    { label: 'Edit', icon: '<i></i>', action: vi.fn() },
    { label: 'Delete', icon: '<i></i>', danger: true, action: vi.fn() },
    { label: '---', separator: true },
    { label: 'Locked', disabled: true, action: vi.fn() }
  ];

  beforeEach(async () => {
    layoutService = new MockLayoutService();

    await TestBed.configureTestingModule({
      imports: [ContextMenuComponent],
      providers: [
        { provide: LayoutService, useValue: layoutService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContextMenuComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not be visible by default', () => {
    const menu = fixture.debugElement.query(By.css('.fixed'));
    expect(menu).toBeNull();
    expect(layoutService.isContextMenuOpen()).toBe(false);
  });

  it('should become visible when layoutService opens it', async () => {
    layoutService.openContextMenu(100, 100, mockItems);
    await fixture.whenStable();

    const menu = fixture.debugElement.query(By.css('.fixed'));
    expect(menu).not.toBeNull();
    expect(layoutService.isContextMenuOpen()).toBe(true);
    expect(layoutService.contextMenuPosition()).toEqual({ x: 100, y: 100 });
  });

  it('should render items correctly', async () => {
    layoutService.openContextMenu(0, 0, mockItems);
    await fixture.whenStable();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    // 3 items are not separators
    expect(buttons.length).toBe(3);
    expect(buttons[0].nativeElement.textContent).toContain('Edit');
    expect(buttons[1].nativeElement.textContent).toContain('Delete');
    expect(buttons[2].nativeElement.textContent).toContain('Locked');
    expect(buttons[2].nativeElement.disabled).toBe(true);
  });

  it('should call action and close when item is clicked', async () => {
    layoutService.openContextMenu(0, 0, mockItems);
    await fixture.whenStable();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].nativeElement.click();

    expect(mockItems[0].action).toHaveBeenCalled();
    expect(layoutService.isContextMenuOpen()).toBe(false);
  });

  it('should close when backdrop is clicked', async () => {
    layoutService.openContextMenu(0, 0, mockItems);
    await fixture.whenStable();

    const backdrop = fixture.debugElement.query(By.css('.fixed'));
    backdrop.nativeElement.dispatchEvent(new MouseEvent('mousedown'));
    
    expect(layoutService.isContextMenuOpen()).toBe(false);
  });
});
