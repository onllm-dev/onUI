import type { Annotation } from '@/types';
import { getPageContext } from '../output-generation';

/**
 * Forensic format: Maximum detail for debugging and analysis
 *
 * Includes everything from detailed plus:
 * - XPath
 * - JSON representation
 * - Viewport info
 * - Creation timestamp
 */
export function formatForensic(annotations: Annotation[]): string {
  const { url, title, timestamp } = getPageContext();

  const lines: string[] = [
    `# Forensic Annotation Report`,
    '',
    '## Page Context',
    `- **Title:** ${title}`,
    `- **URL:** ${url}`,
    `- **Generated:** ${timestamp}`,
    `- **Viewport:** ${window.innerWidth}x${window.innerHeight}`,
    `- **Scroll position:** ${window.scrollX}, ${window.scrollY}`,
    `- **Document size:** ${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`,
    `- **Total annotations:** ${annotations.length}`,
    '',
    '---',
    '',
  ];

  annotations.forEach((annotation, index) => {
    lines.push(`## Annotation ${index + 1}: ${annotation.id}`);
    lines.push('');

    // Metadata
    lines.push('### Metadata');
    lines.push(`- **ID:** \`${annotation.id}\``);
    lines.push(`- **Created:** ${annotation.createdAt}`);
    if (annotation.updatedAt !== annotation.createdAt) {
      lines.push(`- **Updated:** ${annotation.updatedAt}`);
    }
    lines.push('');

    // Element identification
    lines.push('### Element Identification');
    lines.push(`- **CSS Selector:** \`${annotation.selector}\``);
    lines.push(`- **Element Path:** \`${annotation.elementPath}\``);
    lines.push(`- **Tag Name:** \`${annotation.tagName}\``);
    if (annotation.role) {
      lines.push(`- **ARIA Role:** ${annotation.role}`);
    }
    lines.push('');

    // All attributes
    if (annotation.attributes && Object.keys(annotation.attributes).length > 0) {
      lines.push('### Attributes');
      lines.push('```json');
      lines.push(JSON.stringify(annotation.attributes, null, 2));
      lines.push('```');
      lines.push('');
    }

    // Bounding box
    if (annotation.boundingBox) {
      const bb = annotation.boundingBox;
      lines.push('### Bounding Box');
      lines.push('```json');
      lines.push(JSON.stringify({
        top: Math.round(bb.top),
        left: Math.round(bb.left),
        width: Math.round(bb.width),
        height: Math.round(bb.height),
        bottom: bb.bottom ? Math.round(bb.bottom) : Math.round(bb.top + bb.height),
        right: bb.right ? Math.round(bb.right) : Math.round(bb.left + bb.width),
        isFixed: bb.isFixed,
      }, null, 2));
      lines.push('```');
      lines.push('');
    }

    // Text content
    if (annotation.textContent) {
      lines.push('### Text Content');
      lines.push('```');
      lines.push(annotation.textContent);
      lines.push('```');
      lines.push('');
    }

    // Annotation content
    lines.push('### Annotation Content');
    lines.push('');
    lines.push('**Comment:**');
    lines.push(`> ${annotation.comment}`);
    lines.push('');

    if (annotation.selectedText) {
      lines.push('**Selected Text:**');
      lines.push('```');
      lines.push(annotation.selectedText);
      lines.push('```');
      lines.push('');
    }

    // Full JSON
    lines.push('### Raw JSON');
    lines.push('<details>');
    lines.push('<summary>Click to expand</summary>');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(annotation, null, 2));
    lines.push('```');
    lines.push('</details>');
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}
