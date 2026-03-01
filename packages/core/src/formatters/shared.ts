import type { Annotation, RegionGeometry, RegionTarget } from '../types.js';

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

export function isRegionAnnotation(annotation: Annotation): annotation is Annotation & { region: RegionTarget; targetType: 'region' } {
  return annotation.targetType === 'region' && annotation.region !== undefined;
}

export function formatRegionGeometry(geometry: RegionGeometry): string {
  return [
    `x=${Math.round(geometry.x)}`,
    `y=${Math.round(geometry.y)}`,
    `width=${Math.round(geometry.width)}`,
    `height=${Math.round(geometry.height)}`,
    `space=${geometry.coordinateSpace ?? 'document'}`,
  ].join(', ');
}
