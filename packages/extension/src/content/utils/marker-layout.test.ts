import { describe, expect, it } from 'vitest';
import type { Annotation } from '@/types';
import { computeMarkerPlacements } from './marker-layout';

function createAnnotation(
  id: string,
  boundingBox: Annotation['boundingBox']
): Annotation {
  return {
    id,
    selector: `#${id}`,
    elementPath: `div#${id}`,
    tagName: 'div',
    comment: `annotation ${id}`,
    boundingBox,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pageUrl: 'https://example.com',
    pageTitle: 'Example',
    attributes: {},
  };
}

describe('computeMarkerPlacements', () => {
  it('separates overlapping marker clusters', () => {
    const annotations = [
      createAnnotation('a1', { top: 100, left: 100, width: 120, height: 40, isFixed: true }),
      createAnnotation('a2', { top: 100, left: 100, width: 120, height: 40, isFixed: true }),
      createAnnotation('a3', { top: 100, left: 100, width: 120, height: 40, isFixed: true }),
    ];

    const placements = computeMarkerPlacements(annotations, {
      innerWidth: 1280,
      innerHeight: 720,
      scrollX: 0,
      scrollY: 0,
    });

    expect(placements.every((placement) => placement !== null)).toBe(true);

    const resolved = placements.filter((placement): placement is NonNullable<typeof placement> => placement !== null);
    const uniquePairs = new Set(resolved.map((placement) => `${placement.left},${placement.top}`));
    expect(uniquePairs.size).toBe(3);
  });

  it('keeps fixed markers inside viewport bounds', () => {
    const annotations = [
      createAnnotation('a1', { top: -200, left: -100, width: 40, height: 20, isFixed: true }),
      createAnnotation('a2', { top: 1000, left: 1900, width: 40, height: 20, isFixed: true }),
    ];

    const placements = computeMarkerPlacements(annotations, {
      innerWidth: 1000,
      innerHeight: 700,
      scrollX: 0,
      scrollY: 0,
    });

    const first = placements[0];
    const second = placements[1];
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    expect(first!.top).toBeGreaterThanOrEqual(4);
    expect(first!.left).toBeGreaterThanOrEqual(4);
    expect(second!.top).toBeLessThanOrEqual(700 - 20 - 4);
    expect(second!.left).toBeLessThanOrEqual(1000 - 20 - 4);
  });

  it('uses page scroll bounds for absolute markers', () => {
    const annotations = [
      createAnnotation('a1', { top: 80, left: 80, width: 100, height: 20, isFixed: false }),
    ];

    const placements = computeMarkerPlacements(annotations, {
      innerWidth: 800,
      innerHeight: 600,
      scrollX: 300,
      scrollY: 500,
    });

    const first = placements[0];
    expect(first).not.toBeNull();
    expect(first!.position).toBe('absolute');
    expect(first!.top).toBeGreaterThanOrEqual(504);
    expect(first!.left).toBeGreaterThanOrEqual(304);
  });
});

