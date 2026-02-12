import type { Annotation, OutputLevel } from '@/types';
import { formatCompact } from './formatters/compact';
import { formatStandard } from './formatters/standard';
import { formatDetailed } from './formatters/detailed';
import { formatForensic } from './formatters/forensic';

/**
 * Generate output for annotations in the specified format
 */
export function generateOutput(
  annotations: Annotation[],
  level: OutputLevel = 'standard'
): string {
  if (annotations.length === 0) {
    return '# No annotations\n\nNo elements have been annotated yet.';
  }

  switch (level) {
    case 'compact':
      return formatCompact(annotations);
    case 'standard':
      return formatStandard(annotations);
    case 'detailed':
      return formatDetailed(annotations);
    case 'forensic':
      return formatForensic(annotations);
    default:
      return formatStandard(annotations);
  }
}

/**
 * Get page context for output headers
 */
export function getPageContext(): { url: string; title: string; timestamp: string } {
  return {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
  };
}
