import type { BoundingBox } from '@/types';

/**
 * Calculate bounding box for an element
 */
export function getBoundingBox(element: Element): BoundingBox {
  const rect = element.getBoundingClientRect();
  const isFixed = isFixedPosition(element);

  return {
    top: isFixed ? rect.top : rect.top + window.scrollY,
    left: isFixed ? rect.left : rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
    isFixed,
  };
}

/**
 * Check if element or any ancestor has fixed/sticky positioning
 */
export function isFixedPosition(element: Element): boolean {
  let current: Element | null = element;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (style.position === 'fixed' || style.position === 'sticky') {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

/**
 * Calculate bounding box for a text range
 */
export function getTextRangeBoundingBox(range: Range): BoundingBox {
  const rect = range.getBoundingClientRect();
  const startContainer = range.startContainer;
  const element = startContainer.nodeType === Node.ELEMENT_NODE
    ? startContainer as Element
    : startContainer.parentElement;

  const isFixed = element ? isFixedPosition(element) : false;

  return {
    top: isFixed ? rect.top : rect.top + window.scrollY,
    left: isFixed ? rect.left : rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
    isFixed,
  };
}

/**
 * Check if a bounding box is visible in the viewport
 */
export function isInViewport(box: BoundingBox): boolean {
  const viewportTop = box.isFixed ? 0 : window.scrollY;
  const viewportLeft = box.isFixed ? 0 : window.scrollX;
  const viewportBottom = viewportTop + window.innerHeight;
  const viewportRight = viewportLeft + window.innerWidth;

  return (
    box.top < viewportBottom &&
    box.top + box.height > viewportTop &&
    box.left < viewportRight &&
    box.left + box.width > viewportLeft
  );
}
