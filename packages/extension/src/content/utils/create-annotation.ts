import type { AnnotationInput, AnnotationIntent, AnnotationSeverity, BoundingBox } from '@/types';
import { getCssSelector, getElementPath } from './element-path';
import { getBoundingBox, isFixedPosition } from './bounding-box';
import { getReactComponents } from './react-detection';
import { formatComputedStyles } from './computed-styles';

interface CreateAnnotationOptions {
  element: Element;
  comment: string;
  selectedText?: string | undefined;
  selectionRect?: DOMRect;
  intent?: AnnotationIntent | undefined;
  severity?: AnnotationSeverity | undefined;
}

/**
 * Create an annotation input from an element
 */
export function createAnnotationFromElement(
  options: CreateAnnotationOptions
): AnnotationInput {
  const { element, comment, selectedText, selectionRect, intent, severity } = options;

  const selector = getCssSelector(element);
  const elementPath = getElementPath(element);

  // Use selection rect if provided (for text selections), otherwise element bounding box
  let boundingBox: BoundingBox;
  if (selectionRect) {
    const isFixed = isFixedPosition(element);
    boundingBox = {
      top: isFixed ? selectionRect.top : selectionRect.top + window.scrollY,
      left: isFixed ? selectionRect.left : selectionRect.left + window.scrollX,
      width: selectionRect.width,
      height: selectionRect.height,
      bottom: isFixed ? selectionRect.bottom : selectionRect.bottom + window.scrollY,
      right: isFixed ? selectionRect.right : selectionRect.right + window.scrollX,
      isFixed,
    };
  } else {
    boundingBox = getBoundingBox(element);
  }

  // Get element attributes
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    // Skip data attributes and event handlers for cleaner output
    if (!attr.name.startsWith('on') && !attr.name.startsWith('data-')) {
      attributes[attr.name] = attr.value;
    }
  }

  // Get accessible role
  const role = element.getAttribute('role') ||
    getImplicitRole(element) ||
    undefined;

  // Get text content (truncated)
  const textContent = element.textContent?.trim().slice(0, 200) || undefined;

  // OnUI-specific: React components and computed styles
  const reactComponents = getReactComponents(element) || undefined;
  const computedStyles = formatComputedStyles(element);

  // Calculate viewport-relative position
  const rect = element.getBoundingClientRect();
  const viewportX = (rect.left / window.innerWidth) * 100;
  const documentY = rect.top + window.scrollY;

  return {
    selector,
    elementPath,
    tagName: element.tagName.toLowerCase(),
    comment,
    ...(selectedText !== undefined && { selectedText }),
    boundingBox,
    pageUrl: window.location.href,
    pageTitle: document.title,
    attributes,
    ...(role !== undefined && { role }),
    ...(textContent !== undefined && { textContent }),
    // OnUI fields
    ...(reactComponents !== undefined && { reactComponents }),
    computedStyles,
    viewportX,
    documentY,
    ...(intent !== undefined && { intent }),
    ...(severity !== undefined && { severity }),
    status: 'pending' as const,
  };
}

/**
 * Get implicit ARIA role for common elements
 */
function getImplicitRole(element: Element): string | undefined {
  const tag = element.tagName.toLowerCase();

  const roleMap: Record<string, string> = {
    a: 'link',
    button: 'button',
    img: 'img',
    input: getInputRole(element as HTMLInputElement),
    select: 'combobox',
    textarea: 'textbox',
    nav: 'navigation',
    main: 'main',
    header: 'banner',
    footer: 'contentinfo',
    aside: 'complementary',
    article: 'article',
    section: 'region',
    form: 'form',
    table: 'table',
    ul: 'list',
    ol: 'list',
    li: 'listitem',
  };

  return roleMap[tag];
}

/**
 * Get role for input elements based on type
 */
function getInputRole(input: HTMLInputElement): string {
  const type = input.type || 'text';

  const typeRoleMap: Record<string, string> = {
    button: 'button',
    checkbox: 'checkbox',
    radio: 'radio',
    range: 'slider',
    search: 'searchbox',
    submit: 'button',
    reset: 'button',
    text: 'textbox',
    email: 'textbox',
    password: 'textbox',
    tel: 'textbox',
    url: 'textbox',
  };

  return typeRoleMap[type] ?? 'textbox';
}
