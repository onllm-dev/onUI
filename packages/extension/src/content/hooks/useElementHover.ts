import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { getElementAtPoint } from '../utils/element-detection';
import { isOnUiOverlayEvent, stopEventPropagation } from '../utils/overlay-events';
import { throttle } from '../utils/throttle';

interface UseElementHoverOptions {
  enabled: boolean;
  throttleMs?: number;
  onElementClick?: (element: Element, event: MouseEvent | PointerEvent) => void;
}

interface UseElementHoverReturn {
  hoveredElement: Element | null;
}

function isPrimarySelectionEvent(event: MouseEvent | PointerEvent): boolean {
  return event.button === 0;
}

/**
 * Hook for detecting element hover and click
 */
export function useElementHover(
  options: UseElementHoverOptions
): UseElementHoverReturn {
  const { enabled, throttleMs = 16, onElementClick } = options;

  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const lastElementRef = useRef<Element | null>(null);

  // Use refs to avoid recreating callbacks when these values change
  const enabledRef = useRef(enabled);
  const onElementClickRef = useRef(onElementClick);

  // Keep refs up to date
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onElementClickRef.current = onElementClick;
  }, [onElementClick]);

  // Create throttle instance only once and store in ref
  const throttleRef = useRef<{ throttled: (e: MouseEvent) => void; cancel: () => void } | null>(null);

  if (!throttleRef.current) {
    const { throttled, cancel } = throttle((e: MouseEvent) => {
      if (isOnUiOverlayEvent(e)) {
        if (lastElementRef.current) {
          setHoveredElement(null);
          lastElementRef.current = null;
        }
        return;
      }

      if (!enabledRef.current) {
        if (lastElementRef.current) {
          setHoveredElement(null);
          lastElementRef.current = null;
        }
        return;
      }

      const element = getElementAtPoint(e.clientX, e.clientY);
      if (element !== lastElementRef.current) {
        lastElementRef.current = element;
        setHoveredElement(element);
      }
    }, throttleMs);

    throttleRef.current = { throttled, cancel };
  }

  // Stable reference to the throttled handler
  const handleMouseMove = throttleRef.current.throttled;

  const handleSelect = useCallback(
    (event: MouseEvent | PointerEvent) => {
      if (!enabledRef.current || !onElementClickRef.current) return;
      if (!isPrimarySelectionEvent(event)) return;
      if (isOnUiOverlayEvent(event)) return;

      const element = getElementAtPoint(event.clientX, event.clientY);
      if (element) {
        stopEventPropagation(event, true);
        onElementClickRef.current(element, event);
      }
    },
    [] // Stable - uses refs internally
  );

  useEffect(() => {
    if (!enabled) {
      setHoveredElement(null);
      lastElementRef.current = null;
      return;
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    if (typeof window.PointerEvent === 'function') {
      window.addEventListener('pointerdown', handleSelect as EventListener, true);
      document.addEventListener('pointerdown', handleSelect as EventListener, true);
    } else {
      window.addEventListener('mousedown', handleSelect as EventListener, true);
      document.addEventListener('mousedown', handleSelect as EventListener, true);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (typeof window.PointerEvent === 'function') {
        window.removeEventListener('pointerdown', handleSelect as EventListener, true);
        document.removeEventListener('pointerdown', handleSelect as EventListener, true);
      } else {
        window.removeEventListener('mousedown', handleSelect as EventListener, true);
        document.removeEventListener('mousedown', handleSelect as EventListener, true);
      }
      // Cancel any pending throttled calls on cleanup
      throttleRef.current?.cancel();
    };
  }, [enabled, handleMouseMove, handleSelect]);

  return {
    hoveredElement,
  };
}
