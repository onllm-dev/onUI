import type { Annotation, ReportContext } from '../types.js';

export function formatForensic(annotations: Annotation[], context: ReportContext): string {
  const lines: string[] = [
    '# Forensic Annotation Report',
    '',
    '## Page Context',
    `- **Title:** ${context.title}`,
    `- **URL:** ${context.url}`,
    `- **Generated:** ${context.timestamp}`,
    `- **Viewport:** ${context.viewportWidth ?? 0}x${context.viewportHeight ?? 0}`,
    `- **Scroll position:** ${context.scrollX ?? 0}, ${context.scrollY ?? 0}`,
    `- **Document size:** ${context.documentWidth ?? 0}x${context.documentHeight ?? 0}`,
    `- **Total annotations:** ${annotations.length}`,
    '',
    '---',
    '',
  ];

  annotations.forEach((annotation, index) => {
    lines.push(`## Annotation ${index + 1}: ${annotation.id}`);
    lines.push('');
    lines.push('### Metadata');
    lines.push(`- **ID:** \`${annotation.id}\``);
    lines.push(`- **Created:** ${annotation.createdAt}`);
    if (annotation.updatedAt !== annotation.createdAt) {
      lines.push(`- **Updated:** ${annotation.updatedAt}`);
    }
    lines.push('');

    lines.push('### Element Identification');
    lines.push(`- **CSS Selector:** \`${annotation.selector}\``);
    lines.push(`- **Element Path:** \`${annotation.elementPath}\``);
    lines.push(`- **Tag Name:** \`${annotation.tagName}\``);
    if (annotation.role) {
      lines.push(`- **ARIA Role:** ${annotation.role}`);
    }
    lines.push('');

    if (annotation.attributes && Object.keys(annotation.attributes).length > 0) {
      lines.push('### Attributes');
      lines.push('```json');
      lines.push(JSON.stringify(annotation.attributes, null, 2));
      lines.push('```');
      lines.push('');
    }

    if (annotation.boundingBox) {
      const bb = annotation.boundingBox;
      lines.push('### Bounding Box');
      lines.push('```json');
      lines.push(
        JSON.stringify(
          {
            top: Math.round(bb.top),
            left: Math.round(bb.left),
            width: Math.round(bb.width),
            height: Math.round(bb.height),
            bottom: bb.bottom ? Math.round(bb.bottom) : Math.round(bb.top + bb.height),
            right: bb.right ? Math.round(bb.right) : Math.round(bb.left + bb.width),
            isFixed: bb.isFixed,
          },
          null,
          2
        )
      );
      lines.push('```');
      lines.push('');
    }

    if (annotation.textContent) {
      lines.push('### Text Content');
      lines.push('```');
      lines.push(annotation.textContent);
      lines.push('```');
      lines.push('');
    }

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
