import type { Annotation, ReportContext } from '../types.js';
import { truncate } from './shared.js';

export function formatCompact(annotations: Annotation[], context: ReportContext): string {
  const lines: string[] = [`# ${context.title}`, `URL: ${context.url}`, ''];

  annotations.forEach((annotation, index) => {
    let line = `${index + 1}. \`${annotation.selector}\` > ${annotation.comment}`;

    if (annotation.selectedText) {
      line += ` (selected: "${truncate(annotation.selectedText, 50)}")`;
    }

    lines.push(line);
  });

  return lines.join('\n');
}
