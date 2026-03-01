import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StoreRepository } from './repository.js';

function createRegionAnnotation(id: string) {
  return {
    id,
    selector: 'onui-region[shape="ellipse"][x="40"][y="60"][width="120"][height="80"]',
    elementPath: 'ellipse(40,60,120,80)',
    tagName: 'region',
    comment: 'Fix spacing around badge',
    targetType: 'region' as const,
    region: {
      shape: 'ellipse' as const,
      geometry: {
        x: 40,
        y: 60,
        width: 120,
        height: 80,
        coordinateSpace: 'document' as const,
      },
    },
    boundingBox: {
      top: 60,
      left: 40,
      width: 120,
      height: 80,
      isFixed: false,
    },
    createdAt: 10,
    updatedAt: 10,
    pageUrl: 'https://example.com/ui',
    pageTitle: 'UI',
    attributes: { shape: 'ellipse' },
    status: 'pending' as const,
  };
}

describe('StoreRepository region search', () => {
  it('finds region annotations by shape and geometry text', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'onui-store-'));
    const storePath = join(tempDir, 'store.json');

    try {
      const repository = new StoreRepository(storePath);
      await repository.upsertPageSnapshot({
        pageUrl: 'https://example.com/ui',
        pageTitle: 'UI',
        annotations: [createRegionAnnotation('r1')],
      });

      const byShape = await repository.searchAnnotations({ query: 'ellipse' });
      expect(byShape).toHaveLength(1);
      expect(byShape[0]?.id).toBe('r1');

      const byGeometry = await repository.searchAnnotations({ query: 'width 120' });
      expect(byGeometry).toHaveLength(1);
      expect(byGeometry[0]?.id).toBe('r1');

      const byTargetType = await repository.searchAnnotations({ query: 'region' });
      expect(byTargetType).toHaveLength(1);
      expect(byTargetType[0]?.id).toBe('r1');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
