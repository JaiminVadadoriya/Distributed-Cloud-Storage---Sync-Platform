import { vi } from 'vitest';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { TestBed, getTestBed } from '@angular/core/testing';

// Use a global flag to ensure initialization only happens once per worker
const globalObj = (typeof window !== 'undefined' ? window : globalThis) as unknown as Record<string, unknown>;

if (!globalObj['__ANGULAR_TEST_INIT__']) {
  globalObj['__ANGULAR_TEST_INIT__'] = true;

  // Clean reset of the testing environment
  try {
    const testBed = getTestBed();
    if (testBed.platform) {
        // Platform already exists, don't re-init if configured correctly
    } else {
        TestBed.initTestEnvironment(
            BrowserDynamicTestingModule,
            platformBrowserDynamicTesting()
        );
    }
  } catch (e) {
    // If it fails because it was already called, we ignore it
    if (!(e instanceof Error && e.message.includes('already been called'))) {
        throw e;
    }
  }

  // Polyfill for Blob.arrayBuffer
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function() {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(this);
      });
    };
  }

  // Minimal indexedDB mock
  if (typeof window !== 'undefined' && !window.indexedDB) {
    (window as unknown as Record<string, unknown>)['indexedDB'] = {
      open: vi.fn().mockReturnValue({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: null
      })
    };
  }

  // Global Browser Mocks
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), 
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
      get length() { return Object.keys(store).length; }
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });

    (window as unknown as Record<string, unknown>)['ResizeObserver'] = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  }
}
