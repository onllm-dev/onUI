/**
 * Extract key computed styles from an element
 * Returns a formatted object with relevant styles
 */
export interface ComputedStylesInfo {
  layout: Record<string, string>;
  typography: Record<string, string>;
  colors: Record<string, string>;
  spacing: Record<string, string>;
}

/**
 * Get key computed styles from an element
 */
export function getComputedStylesInfo(element: Element): ComputedStylesInfo {
  const styles = window.getComputedStyle(element);

  return {
    layout: {
      display: styles.display,
      position: styles.position,
      width: styles.width,
      height: styles.height,
      'flex-direction': styles.flexDirection,
      'align-items': styles.alignItems,
      'justify-content': styles.justifyContent,
    },
    typography: {
      'font-family': styles.fontFamily.split(',')[0]?.trim() || styles.fontFamily,
      'font-size': styles.fontSize,
      'font-weight': styles.fontWeight,
      'line-height': styles.lineHeight,
      'text-align': styles.textAlign,
    },
    colors: {
      color: styles.color,
      'background-color': styles.backgroundColor,
      'border-color': styles.borderColor,
    },
    spacing: {
      padding: styles.padding,
      margin: styles.margin,
      'border-radius': styles.borderRadius,
    },
  };
}

/**
 * Format computed styles as a compact string for storage
 */
export function formatComputedStyles(element: Element): string {
  const parts: string[] = [];

  // Only include non-default values
  const styles = window.getComputedStyle(element);

  // Layout
  if (styles.display !== 'block' && styles.display !== 'inline') {
    parts.push(`display: ${styles.display}`);
  }
  if (styles.position !== 'static') {
    parts.push(`position: ${styles.position}`);
  }

  // Size
  parts.push(`${styles.width} × ${styles.height}`);

  // Typography
  const fontSize = styles.fontSize;
  const fontWeight = styles.fontWeight;
  if (fontWeight !== '400') {
    parts.push(`font: ${fontWeight} ${fontSize}`);
  } else {
    parts.push(`font-size: ${fontSize}`);
  }

  // Colors (only if not transparent/default)
  const bgColor = styles.backgroundColor;
  if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    parts.push(`bg: ${bgColor}`);
  }

  return parts.join('; ');
}
