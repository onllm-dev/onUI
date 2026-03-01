import { describe, expect, it } from 'vitest';
import {
  clearPageAnnotations,
  createEmptyStore,
  deleteAnnotation,
  deletePageSnapshot,
  getChangesSince,
  updateAnnotationMetadata,
  upsertPageSnapshot,
} from './schema.js';

function createAnnotation(id: string) {
  return {
    id,
    selector: '#btn',
    elementPath: 'button#btn',
    tagName: 'button',
    comment: 'hello',
    boundingBox: {
      top: 1,
      left: 2,
      width: 3,
      height: 4,
      isFixed: false,
    },
    createdAt: 1,
    updatedAt: 1,
    pageUrl: 'https://example.com/a',
    pageTitle: 'Example',
    attributes: {},
    status: 'pending' as const,
  };
}

describe('store schema operations', () => {
  it('upserts a page snapshot', () => {
    const store = createEmptyStore(10);
    const next = upsertPageSnapshot(store, {
      pageUrl: 'https://example.com/a#hash',
      pageTitle: 'A',
      annotations: [createAnnotation('1')],
    }, 20);

    expect(Object.keys(next.pages)).toHaveLength(1);
    expect(next.pages['https://example.com/a']?.annotationIds).toEqual(['1']);
    expect(next.annotationsById['1']?.pageUrl).toBe('https://example.com/a');
  });

  it('deletes page snapshot annotations', () => {
    const store = upsertPageSnapshot(createEmptyStore(), {
      pageUrl: 'https://example.com/a',
      pageTitle: 'A',
      annotations: [createAnnotation('1')],
    });

    const next = deletePageSnapshot(store, 'https://example.com/a');
    expect(next.pages['https://example.com/a']).toBeUndefined();
    expect(next.annotationsById['1']).toBeUndefined();
  });

  it('applies metadata update and appends change log', () => {
    const seeded = upsertPageSnapshot(createEmptyStore(), {
      pageUrl: 'https://example.com/a',
      pageTitle: 'A',
      annotations: [createAnnotation('1')],
    });

    const { store, updated } = updateAnnotationMetadata(
      seeded,
      '1',
      {
        status: 'resolved',
        comment: 'done',
      },
      1,
      2
    );

    expect(updated.status).toBe('resolved');
    expect(updated.comment).toBe('done');
    expect(store.changeLog).toHaveLength(1);

    const changes = getChangesSince(store, 1);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.annotationId).toBe('1');
  });

  it('deletes a single annotation and appends delete change', () => {
    const seeded = upsertPageSnapshot(createEmptyStore(), {
      pageUrl: 'https://example.com/a',
      pageTitle: 'A',
      annotations: [createAnnotation('1')],
    });

    const { store, remainingOnPage } = deleteAnnotation(seeded, '1', 3);
    expect(remainingOnPage).toBe(0);
    expect(store.annotationsById['1']).toBeUndefined();
    expect(store.pages['https://example.com/a']).toBeUndefined();

    const changes = getChangesSince(store, 0);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe('annotation_delete');
  });

  it('clears page annotations and appends page_clear change', () => {
    const seeded = upsertPageSnapshot(createEmptyStore(), {
      pageUrl: 'https://example.com/a',
      pageTitle: 'A',
      annotations: [createAnnotation('1'), createAnnotation('2')],
    });

    const { store, removedCount } = clearPageAnnotations(seeded, 'https://example.com/a', 4);
    expect(removedCount).toBe(2);
    expect(store.pages['https://example.com/a']).toBeUndefined();
    expect(store.annotationsById['1']).toBeUndefined();
    expect(store.annotationsById['2']).toBeUndefined();

    const changes = getChangesSince(store, 0);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe('page_clear');
  });

  it('persists additive region fields in snapshot upsert', () => {
    const regionAnnotation = {
      ...createAnnotation('region-1'),
      selector: 'onui-region[shape="ellipse"]',
      elementPath: 'ellipse(40,50,200,120)',
      tagName: 'region',
      targetType: 'region' as const,
      region: {
        shape: 'ellipse' as const,
        geometry: {
          x: 40,
          y: 50,
          width: 200,
          height: 120,
          coordinateSpace: 'document' as const,
        },
      },
    };

    const next = upsertPageSnapshot(createEmptyStore(), {
      pageUrl: 'https://example.com/region',
      pageTitle: 'Region Page',
      annotations: [regionAnnotation],
    });

    const stored = next.annotationsById['region-1'];
    expect(stored?.targetType).toBe('region');
    expect(stored?.region?.shape).toBe('ellipse');
    expect(stored?.region?.geometry.coordinateSpace).toBe('document');
  });
});
