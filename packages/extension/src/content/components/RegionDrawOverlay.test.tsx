import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, waitFor } from '@testing-library/preact';
import { RegionDrawOverlay } from './RegionDrawOverlay';

const initialScrollX = window.scrollX;
const initialScrollY = window.scrollY;

const originalSetPointerCapture = Element.prototype.setPointerCapture;
const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
const originalHasPointerCapture = Element.prototype.hasPointerCapture;

function setWindowScroll(x: number, y: number) {
  Object.defineProperty(window, 'scrollX', {
    configurable: true,
    value: x,
  });
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: y,
  });
}

function dispatchMouse(
  element: Element,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  options: MouseEventInit
) {
  if (type === 'mousedown') {
    fireEvent.mouseDown(element, options);
    return;
  }

  if (type === 'mousemove') {
    fireEvent.mouseMove(element, options);
    return;
  }

  fireEvent.mouseUp(element, options);
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    configurable: true,
    value() {
      return undefined;
    },
  });

  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    configurable: true,
    value() {
      return undefined;
    },
  });

  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    configurable: true,
    value() {
      return false;
    },
  });
});

afterEach(() => {
  setWindowScroll(initialScrollX, initialScrollY);

  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    configurable: true,
    value: originalSetPointerCapture,
  });

  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    configurable: true,
    value: originalReleasePointerCapture,
  });

  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    configurable: true,
    value: originalHasPointerCapture,
  });
});

describe('RegionDrawOverlay', () => {
  it('returns null when disabled', () => {
    const { container } = render(
      <RegionDrawOverlay enabled={false} shape="rectangle" onComplete={() => {}} />
    );

    expect(container.querySelector('.onui-region-draw-overlay')).toBeNull();
  });

  it('renders preview in viewport space when page is scrolled', async () => {
    setWindowScroll(120, 300);

    const { container } = render(
      <RegionDrawOverlay enabled shape="rectangle" onComplete={() => {}} />
    );

    const overlay = container.querySelector('.onui-region-draw-overlay') as HTMLDivElement;

    act(() => {
      dispatchMouse(overlay, 'mousedown', { clientX: 40, clientY: 50 });
    });

    act(() => {
      dispatchMouse(overlay, 'mousemove', { clientX: 100, clientY: 130 });
    });

    await waitFor(() => {
      const preview = container.querySelector('.onui-region-outline') as HTMLDivElement | null;
      expect(preview).toBeTruthy();
      expect(preview?.style.left).toBe('40px');
      expect(preview?.style.top).toBe('50px');
      expect(preview?.style.width).toBe('60px');
      expect(preview?.style.height).toBe('80px');
    });
  });

  it('emits completed geometry in document space', async () => {
    setWindowScroll(30, 70);
    const onComplete = vi.fn();

    const { container } = render(
      <RegionDrawOverlay enabled shape="ellipse" onComplete={onComplete} />
    );

    const overlay = container.querySelector('.onui-region-draw-overlay') as HTMLDivElement;

    act(() => {
      dispatchMouse(overlay, 'mousedown', { clientX: 10, clientY: 20 });
    });

    act(() => {
      dispatchMouse(overlay, 'mouseup', { clientX: 80, clientY: 100 });
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({
        x: 40,
        y: 90,
        width: 70,
        height: 80,
        coordinateSpace: 'document',
      });
    });
  });

  it('resets draft and does not complete when overlay is disabled mid-drag', async () => {
    const onComplete = vi.fn();
    const onDraftStateChange = vi.fn();

    const { container, rerender } = render(
      <RegionDrawOverlay
        enabled
        shape="rectangle"
        onComplete={onComplete}
        onDraftStateChange={onDraftStateChange}
      />
    );

    const overlay = container.querySelector('.onui-region-draw-overlay') as HTMLDivElement;

    act(() => {
      dispatchMouse(overlay, 'mousedown', { clientX: 20, clientY: 30 });
    });

    act(() => {
      dispatchMouse(overlay, 'mousemove', { clientX: 40, clientY: 50 });
    });

    await waitFor(() => {
      expect(container.querySelector('.onui-region-outline')).toBeTruthy();
    });

    rerender(
      <RegionDrawOverlay
        enabled={false}
        shape="rectangle"
        onComplete={onComplete}
        onDraftStateChange={onDraftStateChange}
      />
    );

    expect(container.querySelector('.onui-region-outline')).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onDraftStateChange).toHaveBeenNthCalledWith(1, true);
    expect(onDraftStateChange).toHaveBeenLastCalledWith(false);
  });

  it('signals draft reset when cancel signal changes', () => {
    const onDraftStateChange = vi.fn();

    const { rerender } = render(
      <RegionDrawOverlay
        enabled
        shape="rectangle"
        cancelSignal={0}
        onComplete={() => {}}
        onDraftStateChange={onDraftStateChange}
      />
    );

    rerender(
      <RegionDrawOverlay
        enabled
        shape="rectangle"
        cancelSignal={1}
        onComplete={() => {}}
        onDraftStateChange={onDraftStateChange}
      />
    );

    expect(onDraftStateChange).toHaveBeenCalledWith(false);
  });
});
