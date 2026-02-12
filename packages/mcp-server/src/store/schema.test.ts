import { describe, expect, it } from 'vitest';
import {
  createEmptyStore,
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
});
