import type { Annotation, ReportContext } from '../types.js';
import { formatRegionGeometry, isRegionAnnotation, truncate } from './shared.js';

export function formatCompact(annotations: Annotation[], context: ReportContext): string {
  const lines: string[] = [`# ${context.title}`, `URL: ${context.url}`, ''];

  annotations.forEach((annotation, index) => {
    const location = isRegionAnnotation(annotation)
      ? `${annotation.region.shape}(${formatRegionGeometry(annotation.region.geometry)})`
      : `\`${annotation.selector}\``;

    let line = `${index + 1}. ${location} > ${annotation.comment}`;

    if (annotation.selectedText) {
      line += ` (selected: "${truncate(annotation.selectedText, 50)}")`;
    }

    lines.push(line);
  });

  return lines.join('\n');
}
