import type { Annotation } from '@/types';
import { getPageContext } from '../output-generation';

/**
 * Standard format: Balanced detail and token usage
 *
 * Format:
 * # Page Title
 * URL: ...
 *
 * ## 1. Element Description
 * - **Selector:** `...`
 * - **Tag:** ...
 * - **Role:** ...
 * - **Comment:** ...
 * - **Selected text:** "..."
 */
export function formatStandard(annotations: Annotation[]): string {
  const { url, title, timestamp } = getPageContext();

  const lines: string[] = [
    `# ${title}`,
    `URL: ${url}`,
    `Generated: ${timestamp}`,
    '',
  ];

  annotations.forEach((annotation, index) => {
    const elementDesc = getElementDescription(annotation);

    lines.push(`## ${index + 1}. ${elementDesc}`);
    lines.push(`- **Selector:** \`${annotation.selector}\``);
    lines.push(`- **Tag:** \`${annotation.tagName}\``);

    if (annotation.role) {
      lines.push(`- **Role:** ${annotation.role}`);
    }

    lines.push(`- **Comment:** ${annotation.comment}`);

    if (annotation.selectedText) {
      lines.push(`- **Selected text:** "${truncate(annotation.selectedText, 100)}"`);
    }

    lines.push('');
  });

  return lines.join('\n');
}

function getElementDescription(annotation: Annotation): string {
  const parts: string[] = [];

  // Try to get a meaningful description
  if (annotation.attributes?.id) {
    parts.push(`#${annotation.attributes.id}`);
  } else if (annotation.attributes?.class) {
    const firstClass = annotation.attributes.class.split(' ')[0];
    parts.push(`.${firstClass}`);
  }

  if (annotation.role) {
    parts.push(`[${annotation.role}]`);
  }

  if (parts.length === 0) {
    parts.push(`<${annotation.tagName}>`);
  }

  return parts.join(' ');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
