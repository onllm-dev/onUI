import { formatCompact } from './formatters/compact.js';
import { formatDetailed } from './formatters/detailed.js';
import { formatForensic } from './formatters/forensic.js';
import { formatStandard } from './formatters/standard.js';
import type { Annotation, OutputLevel, ReportContext } from './types.js';

export function generateReport(
  annotations: Annotation[],
  level: OutputLevel = 'standard',
  context: ReportContext
): string {
  if (annotations.length === 0) {
    return '# No annotations\n\nNo elements have been annotated yet.';
  }

  switch (level) {
    case 'compact':
      return formatCompact(annotations, context);
    case 'detailed':
      return formatDetailed(annotations, context);
    case 'forensic':
      return formatForensic(annotations, context);
    case 'standard':
    default:
      return formatStandard(annotations, context);
  }
}
