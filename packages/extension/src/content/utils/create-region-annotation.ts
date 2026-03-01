import type {
  AnnotationInput,
  AnnotationIntent,
  AnnotationSeverity,
  BoundingBox,
  RegionGeometry,
  RegionShape,
} from '@/types';
import { createBoundingBoxFromRegionGeometry } from './bounding-box';

interface CreateRegionAnnotationOptions {
  comment: string;
  shape: RegionShape;
  geometry: RegionGeometry;
  batchId?: string | undefined;
  intent?: AnnotationIntent | undefined;
  severity?: AnnotationSeverity | undefined;
}

function formatRegionNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getRegionCompatSelector(shape: RegionShape, geometry: RegionGeometry): string {
  return `onui-region[shape="${shape}"][x="${formatRegionNumber(geometry.x)}"][y="${formatRegionNumber(geometry.y)}"][width="${formatRegionNumber(geometry.width)}"][height="${formatRegionNumber(geometry.height)}"]`;
}

function getRegionCompatPath(shape: RegionShape, geometry: RegionGeometry): string {
  return `${shape}(${formatRegionNumber(geometry.x)},${formatRegionNumber(geometry.y)},${formatRegionNumber(geometry.width)},${formatRegionNumber(geometry.height)})`;
}

interface RegionAnnotationBase extends Omit<AnnotationInput, 'region' | 'targetType' | 'boundingBox' | 'attributes'> {
  targetType: 'region';
  region: {
    shape: RegionShape;
    geometry: RegionGeometry;
  };
  boundingBox: BoundingBox;
  attributes: Record<string, string>;
}

export function createAnnotationFromRegion(
  options: CreateRegionAnnotationOptions
): AnnotationInput {
  const { comment, shape, geometry, batchId, intent, severity } = options;
  const coordinateSpace = geometry.coordinateSpace ?? 'document';
  const normalizedGeometry: RegionGeometry = {
    ...geometry,
    coordinateSpace,
  };

  const base: RegionAnnotationBase = {
    selector: getRegionCompatSelector(shape, normalizedGeometry),
    elementPath: getRegionCompatPath(shape, normalizedGeometry),
    tagName: 'region',
    comment,
    targetType: 'region',
    region: {
      shape,
      geometry: normalizedGeometry,
    },
    boundingBox: createBoundingBoxFromRegionGeometry(normalizedGeometry),
    pageUrl: window.location.href,
    pageTitle: document.title,
    attributes: {
      shape,
      coordinateSpace,
    },
    viewportX: (normalizedGeometry.x / window.innerWidth) * 100,
    documentY: normalizedGeometry.y,
    status: 'pending',
  };

  return {
    ...base,
    ...(batchId !== undefined ? { batchId } : {}),
    ...(intent !== undefined ? { intent } : {}),
    ...(severity !== undefined ? { severity } : {}),
  };
}
