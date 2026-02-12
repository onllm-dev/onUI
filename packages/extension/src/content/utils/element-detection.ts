/**
 * Check if an element should be ignored for annotation
 */
export function shouldIgnoreElement(element: Element): boolean {
  // Ignore our own UI
  if (element.closest('#onui-shadow-host')) {
    return true;
  }

  // Ignore common non-interactive elements
  const ignoredTags = ['HTML', 'HEAD', 'SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT'];
  if (ignoredTags.includes(element.tagName)) {
    return true;
  }

  // Ignore invisible elements
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return true;
  }

  // Ignore elements with zero dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return true;
  }

  return false;
}

/**
 * Get the element at a given point, excluding our UI
 * Uses elementsFromPoint to avoid hide/show layout thrashing
 */
export function getElementAtPoint(x: number, y: number): Element | null {
  // Get all elements at this point (returns from topmost to bottommost)
  const elements = document.elementsFromPoint(x, y);

  // Find the first valid element (skip our UI and ignored elements)
  for (const element of elements) {
    // Skip our own shadow host
    if (element.id === 'onui-shadow-host') {
      continue;
    }

    // Skip if element is inside our shadow host (shouldn't happen but be safe)
    if (element.closest('#onui-shadow-host')) {
      continue;
    }

    // Skip ignored elements
    if (shouldIgnoreElement(element)) {
      continue;
    }

    return element;
  }

  return null;
}

/**
 * Get a readable description of an element
 */
export function getElementDescription(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className && typeof element.className === 'string'
    ? `.${element.className.split(' ').filter(Boolean).join('.')}`
    : '';

  // Get additional context
  let context = '';

  if (element instanceof HTMLInputElement) {
    context = element.type ? `[type="${element.type}"]` : '';
  } else if (element instanceof HTMLButtonElement) {
    context = element.textContent?.trim().slice(0, 20) || '';
    if (context) context = ` "${context}"`;
  } else if (element instanceof HTMLAnchorElement) {
    const text = element.textContent?.trim().slice(0, 20);
    if (text) context = ` "${text}"`;
  }

  return `${tag}${id}${classes}${context}`;
}
