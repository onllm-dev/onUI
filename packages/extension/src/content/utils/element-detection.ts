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

function isInteractiveElement(element: Element): boolean {
  if (element instanceof HTMLButtonElement ||
      element instanceof HTMLAnchorElement ||
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement) {
    return true;
  }

  if (element.hasAttribute('role') || element.hasAttribute('contenteditable')) {
    return true;
  }

  const style = window.getComputedStyle(element);
  return style.cursor === 'pointer';
}

function isGenericContainer(element: Element): boolean {
  return ['DIV', 'SECTION', 'MAIN', 'ARTICLE', 'ASIDE', 'NAV'].includes(element.tagName);
}

/**
 * Get the element at a given point, excluding our UI
 * Uses elementsFromPoint to avoid hide/show layout thrashing.
 * Prefers meaningful targets over large wrapper containers.
 */
export function getElementAtPoint(x: number, y: number): Element | null {
  // Get all elements at this point (returns from topmost to bottommost)
  const elements = document.elementsFromPoint(x, y);
  const candidates: Array<{ element: Element; area: number }> = [];

  for (const element of elements) {
    if (element.id === 'onui-shadow-host' || element.closest('#onui-shadow-host')) {
      continue;
    }
    if (shouldIgnoreElement(element)) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    candidates.push({ element, area: rect.width * rect.height });
  }

  if (candidates.length === 0) {
    return null;
  }

  const smallestArea = Math.min(...candidates.map((candidate) => candidate.area));

  for (const candidate of candidates) {
    const { element, area } = candidate;
    const rect = element.getBoundingClientRect();
    const isLargeWrapper =
      isGenericContainer(element) &&
      element.children.length > 0 &&
      !isInteractiveElement(element) &&
      rect.width >= window.innerWidth * 0.8 &&
      area > smallestArea * 8;

    if (isLargeWrapper) {
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
