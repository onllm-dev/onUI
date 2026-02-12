import type { Annotation, ReportContext } from '../types.js';
import { truncate } from './shared.js';

function getElementDescription(annotation: Annotation): string {
  const parts: string[] = [];

  if (annotation.attributes?.id) {
    parts.push(`#${annotation.attributes.id}`);
  } else if (annotation.attributes?.class) {
    const firstClass = annotation.attributes.class.split(' ')[0];
    if (firstClass) {
      parts.push(`.${firstClass}`);
    }
  }

  if (annotation.role) {
    parts.push(`[${annotation.role}]`);
  }

  if (parts.length === 0) {
    parts.push(`<${annotation.tagName}>`);
  }

  return parts.join(' ');
}

export function formatStandard(annotations: Annotation[], context: ReportContext): string {
  const lines: string[] = [
    `# ${context.title}`,
    `URL: ${context.url}`,
    `Generated: ${context.timestamp}`,
    '',
  ];

  annotations.forEach((annotation, index) => {
    lines.push(`## ${index + 1}. ${getElementDescription(annotation)}`);
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
