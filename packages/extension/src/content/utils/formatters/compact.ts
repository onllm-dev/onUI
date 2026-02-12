import type { Annotation } from '@/types';
import { getPageContext } from '../output-generation';

/**
 * Compact format: Minimal output for token efficiency
 *
 * Format:
 * # Page Title
 * URL: ...
 *
 * 1. selector > Comment
 * 2. selector > Comment (selected: "text")
 */
export function formatCompact(annotations: Annotation[]): string {
  const { url, title } = getPageContext();

  const lines: string[] = [
    `# ${title}`,
    `URL: ${url}`,
    '',
  ];

  annotations.forEach((annotation, index) => {
    let line = `${index + 1}. \`${annotation.selector}\` > ${annotation.comment}`;

    if (annotation.selectedText) {
      line += ` (selected: "${truncate(annotation.selectedText, 50)}")`;
    }

    lines.push(line);
  });

  return lines.join('\n');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
