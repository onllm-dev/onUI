import type { Annotation, BoundingBox } from '@/types';

export interface MarkerPlacement {
  position: 'fixed' | 'absolute';
  top: number;
  left: number;
}

interface ViewportState {
  innerWidth: number;
  innerHeight: number;
  scrollX: number;
  scrollY: number;
}

const MARKER_SIZE = 20;
const MARKER_EDGE_OFFSET = 8;
const PAGE_PADDING = 4;
const COLLISION_PADDING = 4;
const OFFSET_STEP = 18;
const OFFSET_RINGS = 4;

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function getViewportState(): ViewportState {
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

function clampToBounds(
  candidate: MarkerPlacement,
  viewport: ViewportState
): MarkerPlacement {
  const isFixed = candidate.position === 'fixed';
  const minTop = isFixed ? PAGE_PADDING : viewport.scrollY + PAGE_PADDING;
  const minLeft = isFixed ? PAGE_PADDING : viewport.scrollX + PAGE_PADDING;
  const maxTop = isFixed
    ? viewport.innerHeight - MARKER_SIZE - PAGE_PADDING
    : viewport.scrollY + viewport.innerHeight - MARKER_SIZE - PAGE_PADDING;
  const maxLeft = isFixed
    ? viewport.innerWidth - MARKER_SIZE - PAGE_PADDING
    : viewport.scrollX + viewport.innerWidth - MARKER_SIZE - PAGE_PADDING;

  return {
    ...candidate,
    top: clamp(candidate.top, minTop, maxTop),
    left: clamp(candidate.left, minLeft, maxLeft),
  };
}

function createBasePlacement(
  boundingBox: BoundingBox,
  viewport: ViewportState
): MarkerPlacement {
  const base: MarkerPlacement = {
    position: boundingBox.isFixed ? 'fixed' : 'absolute',
    top: boundingBox.top - MARKER_EDGE_OFFSET,
    left: boundingBox.left + boundingBox.width - MARKER_EDGE_OFFSET,
  };

  return clampToBounds(base, viewport);
}

function buildOffsetCandidates(): Array<{ dx: number; dy: number }> {
  const offsets: Array<{ dx: number; dy: number }> = [{ dx: 0, dy: 0 }];

  for (let ring = 1; ring <= OFFSET_RINGS; ring += 1) {
    for (let y = -ring; y <= ring; y += 1) {
      for (let x = -ring; x <= ring; x += 1) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== ring) {
          continue;
        }

        offsets.push({
          dx: x * OFFSET_STEP,
          dy: y * OFFSET_STEP,
        });
      }
    }
  }

  return offsets;
}

const OFFSET_CANDIDATES = buildOffsetCandidates();

function overlaps(a: MarkerPlacement, b: MarkerPlacement): boolean {
  if (a.position !== b.position) {
    return false;
  }

  const threshold = MARKER_SIZE + COLLISION_PADDING;
  const horizontalDistance = Math.abs(a.left - b.left);
  const verticalDistance = Math.abs(a.top - b.top);
  return horizontalDistance < threshold && verticalDistance < threshold;
}

/**
 * Compute on-screen marker placements while avoiding overlap for clustered annotations.
 */
export function computeMarkerPlacements(
  annotations: Annotation[],
  viewport: ViewportState = getViewportState()
): Array<MarkerPlacement | null> {
  const placements: Array<MarkerPlacement | null> = [];
  const placed: MarkerPlacement[] = [];

  for (const annotation of annotations) {
    if (!annotation.boundingBox) {
      placements.push(null);
      continue;
    }

    const basePlacement = createBasePlacement(annotation.boundingBox, viewport);
    let resolvedPlacement = basePlacement;

    for (const offset of OFFSET_CANDIDATES) {
      const candidate = clampToBounds(
        {
          position: basePlacement.position,
          top: basePlacement.top + offset.dy,
          left: basePlacement.left + offset.dx,
        },
        viewport
      );

      const hasCollision = placed.some((existing) => overlaps(existing, candidate));
      if (!hasCollision) {
        resolvedPlacement = candidate;
        break;
      }
    }

    placements.push(resolvedPlacement);
    placed.push(resolvedPlacement);
  }

  return placements;
}

