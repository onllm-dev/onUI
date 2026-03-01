import { describe, expect, it } from 'vitest';
import type { Annotation } from '../types.js';
import { formatCompact } from './compact.js';
import { formatStandard } from './standard.js';
import { formatDetailed } from './detailed.js';
import { formatForensic } from './forensic.js';

function createRegionAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'region-1',
    selector: 'onui-region[shape="rectangle"]',
    elementPath: 'rectangle(10,20,120,80)',
    tagName: 'region',
    comment: 'Adjust this block spacing',
    targetType: 'region',
    region: {
      shape: 'rectangle',
      geometry: {
        x: 10,
        y: 20,
        width: 120,
        height: 80,
        coordinateSpace: 'document',
      },
    },
    boundingBox: {
      top: 20,
      left: 10,
      width: 120,
      height: 80,
      isFixed: false,
    },
    createdAt: 1,
    updatedAt: 1,
    pageUrl: 'https://example.com',
    pageTitle: 'Example',
    attributes: {},
    ...overrides,
  };
}

const context = {
  url: 'https://example.com',
  title: 'Example',
  timestamp: '2026-02-26T00:00:00.000Z',
  viewportWidth: 1280,
  viewportHeight: 720,
  scrollX: 0,
  scrollY: 0,
  documentWidth: 1280,
  documentHeight: 2000,
};

describe('region formatter support', () => {
  it('includes region geometry in compact output', () => {
    const output = formatCompact([createRegionAnnotation()], context);

    expect(output).toContain('rectangle(');
    expect(output).toContain('x=10');
    expect(output).toContain('width=120');
  });

  it('includes target type and shape in standard output', () => {
    const output = formatStandard([createRegionAnnotation()], context);

    expect(output).toContain('**Target type:** `region`');
    expect(output).toContain('**Shape:** `rectangle`');
    expect(output).toContain('**Geometry:**');
  });

  it('shows compatibility fields in detailed output for regions', () => {
    const output = formatDetailed([createRegionAnnotation()], context);

    expect(output).toContain('**Target type:** `region`');
    expect(output).toContain('**Selector (compat):**');
    expect(output).toContain('**Path (compat):**');
  });

  it('reports region identification in forensic output', () => {
    const output = formatForensic([createRegionAnnotation()], context);

    expect(output).toContain('**Target Type:** `region`');
    expect(output).toContain('**Region Shape:** `rectangle`');
    expect(output).toContain('**Region Geometry:**');
  });
});
