import { useMemo } from 'preact/hooks';

interface ElementHighlightProps {
  element: Element;
  color?: string;
  selected?: boolean;
}

// WeakMap cache for isFixedPosition to avoid repeated DOM walks
const fixedPositionCache = new WeakMap<Element, boolean>();

/**
 * Check if element or any ancestor has fixed/sticky positioning
 * Uses WeakMap cache to avoid repeated DOM traversals
 */
function isFixedPosition(element: Element): boolean {
  // Check cache first
  const cached = fixedPositionCache.get(element);
  if (cached !== undefined) {
    return cached;
  }

  let current: Element | null = element;
  let result = false;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (style.position === 'fixed' || style.position === 'sticky') {
      result = true;
      break;
    }
    current = current.parentElement;
  }

  // Cache the result
  fixedPositionCache.set(element, result);
  return result;
}

/**
 * Highlight overlay for hovered elements
 */
export function ElementHighlight({ element, color = '#6366f1', selected = false }: ElementHighlightProps) {
  // Memoize the fixed position check
  const isFixed = useMemo(() => isFixedPosition(element), [element]);

  // Use a more prominent color when selected
  const highlightColor = selected ? '#f97316' : color;

  // Memoize style calculation
  const style = useMemo(() => {
    const rect = element.getBoundingClientRect();

    return {
      position: isFixed ? 'fixed' : 'absolute',
      top: isFixed ? `${rect.top}px` : `${rect.top + window.scrollY}px`,
      left: isFixed ? `${rect.left}px` : `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: `2px solid ${highlightColor}`,
      backgroundColor: `${highlightColor}20`,
      pointerEvents: 'none',
      boxSizing: 'border-box',
      zIndex: 2147483646,
      transition: 'all 50ms ease-out',
    };
  }, [element, highlightColor, isFixed]);

  return <div style={style} />;
}
