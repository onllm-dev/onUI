import { describe, expect, it } from 'vitest';
import { createAnnotationFromRegion } from './create-region-annotation';

describe('createAnnotationFromRegion', () => {
  it('creates a region annotation with compatibility fields', () => {
    const annotation = createAnnotationFromRegion({
      comment: 'Adjust spacing around card',
      shape: 'rectangle',
      geometry: {
        x: 120,
        y: 240,
        width: 360,
        height: 180,
      },
      intent: 'fix',
      severity: 'important',
    });

    expect(annotation.targetType).toBe('region');
    expect(annotation.tagName).toBe('region');
    expect(annotation.region?.shape).toBe('rectangle');
    expect(annotation.region?.geometry.coordinateSpace).toBe('document');

    expect(annotation.selector).toContain('onui-region');
    expect(annotation.elementPath).toContain('rectangle');

    expect(annotation.boundingBox.top).toBe(240);
    expect(annotation.boundingBox.left).toBe(120);
    expect(annotation.boundingBox.width).toBe(360);
    expect(annotation.boundingBox.height).toBe(180);

    expect(annotation.intent).toBe('fix');
    expect(annotation.severity).toBe('important');
    expect(annotation.status).toBe('pending');
  });

  it('preserves explicit coordinate space and optional batch id', () => {
    const annotation = createAnnotationFromRegion({
      comment: 'Review elliptical graphic area',
      shape: 'ellipse',
      geometry: {
        x: 40,
        y: 75,
        width: 220,
        height: 110,
        coordinateSpace: 'document',
      },
      batchId: 'batch-123',
    });

    expect(annotation.region?.shape).toBe('ellipse');
    expect(annotation.region?.geometry.coordinateSpace).toBe('document');
    expect(annotation.batchId).toBe('batch-123');
    expect(annotation.attributes.coordinateSpace).toBe('document');
  });
});
