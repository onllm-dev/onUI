import type { Annotation, ReportContext } from '../types.js';
import { formatRegionGeometry, isRegionAnnotation, truncate } from './shared.js';

export function formatDetailed(annotations: Annotation[], context: ReportContext): string {
  const lines: string[] = [
    `# ${context.title}`,
    `URL: ${context.url}`,
    `Generated: ${context.timestamp}`,
    `Total annotations: ${annotations.length}`,
    '',
  ];

  annotations.forEach((annotation, index) => {
    const isRegion = isRegionAnnotation(annotation);
    lines.push(`## ${index + 1}. ${isRegion ? `${annotation.region.shape} region` : annotation.elementPath}`);
    lines.push('');
    lines.push('### Target Info');

    if (isRegion) {
      lines.push('- **Target type:** `region`');
      lines.push(`- **Shape:** \`${annotation.region.shape}\``);
      lines.push(`- **Geometry:** ${formatRegionGeometry(annotation.region.geometry)}`);
      lines.push(`- **Selector (compat):** \`${annotation.selector}\``);
      lines.push(`- **Tag (compat):** \`${annotation.tagName}\``);
      lines.push(`- **Path (compat):** \`${annotation.elementPath}\``);
    } else {
      lines.push('- **Target type:** `element`');
      lines.push(`- **Selector:** \`${annotation.selector}\``);
      lines.push(`- **Tag:** \`${annotation.tagName}\``);
      lines.push(`- **Path:** \`${annotation.elementPath}\``);

      if (annotation.role) {
        lines.push(`- **Role:** ${annotation.role}`);
      }

      if (annotation.attributes && Object.keys(annotation.attributes).length > 0) {
        lines.push('');
        lines.push('### Attributes');
        for (const [key, value] of Object.entries(annotation.attributes)) {
          lines.push(`- \`${key}\`: \`${truncate(value, 80)}\``);
        }
      }
    }

    if (annotation.textContent) {
      lines.push('');
      lines.push('### Text Content');
      lines.push('```');
      lines.push(truncate(annotation.textContent, 200));
      lines.push('```');
    }

    if (annotation.boundingBox) {
      const bb = annotation.boundingBox;
      lines.push('');
      lines.push('### Position');
      lines.push(`- **Top:** ${Math.round(bb.top)}px`);
      lines.push(`- **Left:** ${Math.round(bb.left)}px`);
      lines.push(`- **Width:** ${Math.round(bb.width)}px`);
      lines.push(`- **Height:** ${Math.round(bb.height)}px`);
      if (bb.isFixed) {
        lines.push('- **Position:** fixed');
      }
    }

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
