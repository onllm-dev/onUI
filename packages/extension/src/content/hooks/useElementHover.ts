import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { getElementAtPoint } from '../utils/element-detection';
import { throttle } from '../utils/throttle';

interface UseElementHoverOptions {
  enabled: boolean;
  throttleMs?: number;
  onElementClick?: (element: Element) => void;
}

interface UseElementHoverReturn {
  hoveredElement: Element | null;
}

const ONUI_SHADOW_HOST_ID = 'onui-shadow-host';

function isOnUiOverlayEvent(event: MouseEvent): boolean {
  const target = event.target;
  if (target instanceof Element) {
    if (target.id === ONUI_SHADOW_HOST_ID) {
      return true;
    }

    if (target.closest(`#${ONUI_SHADOW_HOST_ID}`)) {
      return true;
    }
  }

  return event.composedPath().some((node) => {
    return node instanceof Element && node.id === ONUI_SHADOW_HOST_ID;
  });
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

      // Only update if element changed
      if (element !== lastElementRef.current) {
        lastElementRef.current = element;
        setHoveredElement(element);
      }
    }, throttleMs);

    throttleRef.current = { throttled, cancel };
  }

  // Stable reference to the throttled handler
  const handleMouseMove = throttleRef.current.throttled;

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!enabledRef.current || !onElementClickRef.current) return;
      if (isOnUiOverlayEvent(e)) return;

      const element = getElementAtPoint(e.clientX, e.clientY);
      if (element) {
        e.preventDefault();
        e.stopPropagation();
        onElementClickRef.current(element);
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
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, { capture: true });
      // Cancel any pending throttled calls on cleanup
      throttleRef.current?.cancel();
    };
  }, [enabled, handleMouseMove, handleClick]);

  return {
    hoveredElement,
  };
}
