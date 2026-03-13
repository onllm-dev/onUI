import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { makePageInert, restorePageInteractivity } from './page-inert';
import { ONUI_SHADOW_HOST_ID } from './overlay-events';

function installPointerEventShim() {
  if (typeof window.PointerEvent === 'function') {
    return;
  }

  class PointerEventShim extends MouseEvent {}

  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: PointerEventShim,
  });
}

describe('page-inert utilities', () => {
  beforeAll(() => {
    installPointerEventShim();
  });

  beforeEach(() => {
    // Reset between tests
    restorePageInteractivity();
    document.documentElement.style.overflow = '';
  });

  afterEach(() => {
    // Cleanup
    restorePageInteractivity();
  });

  describe('makePageInert', () => {
    it('sets overflow hidden on document element', () => {
      makePageInert();

      expect(document.documentElement.style.overflow).toBe('hidden');
    });

    it('is idempotent - calling twice does not duplicate listeners', () => {
      makePageInert();
      makePageInert();

      // Should be able to restore once and have clean state
      restorePageInteractivity();
      expect(document.documentElement.style.overflow).toBe('');
    });

    it('blocks pointer events from host page', () => {
      makePageInert();

      const hostElement = document.createElement('button');
      document.body.appendChild(hostElement);

      const prevented = vi.fn();
      const propagated = vi.fn();

      hostElement.addEventListener('pointerdown', propagated);
      document.addEventListener('pointerdown', prevented);

      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
      });
      hostElement.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(propagated).not.toHaveBeenCalled();

      document.body.removeChild(hostElement);
      document.removeEventListener('pointerdown', prevented);
    });

    it('blocks click events from host page', () => {
      makePageInert();

      const hostElement = document.createElement('button');
      document.body.appendChild(hostElement);

      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      hostElement.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);

      document.body.removeChild(hostElement);
    });

    it('blocks scroll wheel events from host page', () => {
      makePageInert();

      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('blocks scroll navigation keys from host page', () => {
      makePageInert();

      const scrollKeys = ['Space', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'];

      for (const code of scrollKeys) {
        const event = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code,
        });
        document.body.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
      }
    });

    it('allows non-scroll keys through', () => {
      makePageInert();

      const nonScrollKeys = ['KeyA', 'Enter', 'Tab', 'Escape'];

      for (const code of nonScrollKeys) {
        const event = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code,
        });
        document.body.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
      }
    });

    it('allows events from onUI shadow host through', () => {
      makePageInert();

      // Create onUI shadow host
      const shadowHost = document.createElement('div');
      shadowHost.id = ONUI_SHADOW_HOST_ID;
      document.body.appendChild(shadowHost);

      const overlayButton = document.createElement('button');
      shadowHost.appendChild(overlayButton);

      const propagated = vi.fn();
      overlayButton.addEventListener('pointerdown', propagated);

      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
      });
      overlayButton.dispatchEvent(event);

      // Events from onUI overlay should NOT be blocked
      expect(event.defaultPrevented).toBe(false);
      expect(propagated).toHaveBeenCalled();

      document.body.removeChild(shadowHost);
    });
  });

  describe('restorePageInteractivity', () => {
    it('restores original overflow style', () => {
      document.documentElement.style.overflow = 'scroll';
      makePageInert();

      expect(document.documentElement.style.overflow).toBe('hidden');

      restorePageInteractivity();

      expect(document.documentElement.style.overflow).toBe('scroll');
    });

    it('removes all blocking listeners', () => {
      makePageInert();
      restorePageInteractivity();

      const hostElement = document.createElement('button');
      document.body.appendChild(hostElement);

      const propagated = vi.fn();
      hostElement.addEventListener('pointerdown', propagated);

      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
      });
      hostElement.dispatchEvent(event);

      // Events should no longer be blocked
      expect(event.defaultPrevented).toBe(false);
      expect(propagated).toHaveBeenCalled();

      document.body.removeChild(hostElement);
    });

    it('is safe to call when not inert', () => {
      // Should not throw
      restorePageInteractivity();
      restorePageInteractivity();
    });

    it('allows scroll keys after restore', () => {
      makePageInert();
      restorePageInteractivity();

      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        code: 'Space',
      });
      document.body.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });
});
