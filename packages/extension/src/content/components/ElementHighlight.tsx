import { useLayoutEffect, useMemo, useState } from 'preact/hooks';

interface ElementHighlightProps {
  element: Element;
  color?: string;
  selected?: boolean;
  frozenRect?: DOMRect | undefined;
}

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getElementRect(element: Element): ElementRect {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function isSameRect(a: ElementRect, b: ElementRect): boolean {
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

/**
 * Highlight overlay for hovered elements.
 * If frozenRect is provided, uses that instead of live tracking.
 */
export function ElementHighlight({ element, color = '#6366f1', selected = false, frozenRect }: ElementHighlightProps) {
  const [rect, setRect] = useState<ElementRect>(() => {
    // Use frozen rect if available, otherwise get live rect
    if (frozenRect) {
      return {
        top: frozenRect.top,
        left: frozenRect.left,
        width: frozenRect.width,
        height: frozenRect.height,
      };
    }
    return getElementRect(element);
  });

  useLayoutEffect(() => {
    // Skip live rect tracking when frozen
    if (frozenRect) {
      setRect({
        top: frozenRect.top,
        left: frozenRect.left,
        width: frozenRect.width,
        height: frozenRect.height,
      });
      return;
    }

    let rafId: number | null = null;
    let isCancelled = false;

    const tick = () => {
      if (isCancelled) {
        return;
      }

      const nextRect = getElementRect(element);
      setRect((currentRect) => (isSameRect(currentRect, nextRect) ? currentRect : nextRect));
      rafId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      isCancelled = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [element, frozenRect]);

  // Use a more prominent color when selected
  const highlightColor = selected ? '#f97316' : color;

  // Memoize style calculation
  const style = useMemo(() => {
    return {
      position: 'fixed',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: `2px solid ${highlightColor}`,
      backgroundColor: `${highlightColor}20`,
      pointerEvents: 'none',
      boxSizing: 'border-box',
      zIndex: 2147483646,
    };
  }, [rect, highlightColor]);

  return <div style={style} />;
}
