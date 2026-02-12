/**
 * Generate a unique XPath for an element
 */
export function getXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling: Element | null = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = current.tagName.toLowerCase();
    const indexSuffix = index > 1 ? `[${index}]` : '';
    parts.unshift(`${tagName}${indexSuffix}`);

    current = current.parentElement;
  }

  return '/' + parts.join('/');
}

/**
 * Generate a CSS selector for an element
 */
export function getCssSelector(element: Element): string {
  // If element has an ID, use it
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();

    // Prefer stable data/name attributes when available
    const dataTestId = current.getAttribute('data-testid');
    const dataTest = current.getAttribute('data-test');
    const name = current.getAttribute('name');

    if (dataTestId) {
      selector += `[data-testid="${CSS.escape(dataTestId)}"]`;
    } else if (dataTest) {
      selector += `[data-test="${CSS.escape(dataTest)}"]`;
    } else if (name) {
      selector += `[name="${CSS.escape(name)}"]`;
    } else if (current.className && typeof current.className === 'string') {
      // Add classes (limit to 2 for readability)
      const classes = current.className
        .split(' ')
        .filter(Boolean)
        .filter((className) => !className.startsWith('onui-'))
        .slice(0, 2);
      if (classes.length > 0) {
        selector += classes.map((c) => `.${CSS.escape(c)}`).join('');
      }
    } else {
      const role = current.getAttribute('role');
      if (role) {
        selector += `[role="${CSS.escape(role)}"]`;
      }
    }

    // Add nth-of-type only when this selector still matches sibling duplicates
    const parent = current.parentElement;
    if (parent) {
      const matchingSiblings = Array.from(parent.children).filter((child) =>
        child.matches(selector)
      );
      if (matchingSiblings.length > 1) {
        const sameTagSiblings = Array.from(parent.children).filter(
          (child) => child.tagName === current!.tagName
        );
        const index = sameTagSiblings.indexOf(current) + 1;
        if (index > 0) {
          selector += `:nth-of-type(${index})`;
        }
      }
    }

    parts.unshift(selector);

    // Check if current selector is unique
    const fullSelector = parts.join(' > ');
    try {
      if (document.querySelectorAll(fullSelector).length === 1) {
        return fullSelector;
      }
    } catch {
      // Invalid selector, continue building
    }

    current = current.parentElement;
  }

  return parts.join(' > ');
}

/**
 * Generate a human-readable element path
 */
export function getElementPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  let depth = 0;
  const maxDepth = 4;

  while (current && current !== document.body && depth < maxDepth) {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      part += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const firstClass = current.className.split(' ').filter(Boolean)[0];
      if (firstClass) {
        part += `.${firstClass}`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;
    depth++;
  }

  if (current && current !== document.body) {
    parts.unshift('...');
  }

  return parts.join(' > ');
}
