import type { Annotation } from '@/types';
import { getPageContext } from '../output-generation';

/**
 * Detailed format: Full element context for complex debugging
 *
 * Includes all standard fields plus:
 * - Element path
 * - All attributes
 * - Text content
 * - Bounding box
 */
export function formatDetailed(annotations: Annotation[]): string {
  const { url, title, timestamp } = getPageContext();

  const lines: string[] = [
    `# ${title}`,
    `URL: ${url}`,
    `Generated: ${timestamp}`,
    `Total annotations: ${annotations.length}`,
    '',
  ];

  annotations.forEach((annotation, index) => {
    lines.push(`## ${index + 1}. ${annotation.elementPath}`);
    lines.push('');
    lines.push('### Element Info');
    lines.push(`- **Selector:** \`${annotation.selector}\``);
    lines.push(`- **Tag:** \`${annotation.tagName}\``);
    lines.push(`- **Path:** \`${annotation.elementPath}\``);

    if (annotation.role) {
      lines.push(`- **Role:** ${annotation.role}`);
    }

    // Attributes
    if (annotation.attributes && Object.keys(annotation.attributes).length > 0) {
      lines.push('');
      lines.push('### Attributes');
      for (const [key, value] of Object.entries(annotation.attributes)) {
        lines.push(`- \`${key}\`: \`${truncate(value, 80)}\``);
      }
    }

    // Text content
    if (annotation.textContent) {
      lines.push('');
      lines.push('### Text Content');
      lines.push('```');
      lines.push(truncate(annotation.textContent, 200));
      lines.push('```');
    }

    // Bounding box
    if (annotation.boundingBox) {
      const bb = annotation.boundingBox;
      lines.push('');
      lines.push('### Position');
      lines.push(`- **Top:** ${Math.round(bb.top)}px`);
      lines.push(`- **Left:** ${Math.round(bb.left)}px`);
      lines.push(`- **Width:** ${Math.round(bb.width)}px`);
      lines.push(`- **Height:** ${Math.round(bb.height)}px`);
      if (bb.isFixed) {
        lines.push(`- **Position:** fixed`);
      }
    }

    // Comment and selection
    lines.push('');
    lines.push('### Annotation');
    lines.push(`**Comment:** ${annotation.comment}`);

    if (annotation.selectedText) {
      lines.push('');
      lines.push('**Selected Text:**');
      lines.push('```');
      lines.push(annotation.selectedText);
      lines.push('```');
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
