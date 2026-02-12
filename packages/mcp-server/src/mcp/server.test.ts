import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StoreRepository } from '../store/repository.js';
import { upsertPageSnapshot, createEmptyStore } from '../store/schema.js';
import { writeStore } from '../store/io.js';
import type { Annotation } from '@onui/core';

const tempDirs: string[] = [];

function createTestAnnotation(id: string, overrides: Partial<Annotation> = {}): Annotation {
  return {
    id,
    selector: `#element-${id}`,
    elementPath: `div > #element-${id}`,
    tagName: 'button',
    comment: `Test comment ${id}`,
    boundingBox: {
      top: 100,
      left: 200,
      width: 150,
      height: 50,
      isFixed: false,
    },
    createdAt: 1000,
    updatedAt: 1000,
    pageUrl: 'https://example.com/test',
    pageTitle: 'Test Page',
    attributes: { class: 'btn' },
    status: 'pending',
    intent: 'fix',
    severity: 'important',
    ...overrides,
  };
}

async function setupTestStore(storePath: string, annotations: Annotation[] = []): Promise<void> {
  let store = createEmptyStore();

  if (annotations.length > 0) {
    const pageUrl = annotations[0]?.pageUrl ?? 'https://example.com/test';
    const pageTitle = annotations[0]?.pageTitle ?? 'Test Page';
    store = upsertPageSnapshot(store, { pageUrl, pageTitle, annotations });
  }

  await writeStore(storePath, store);
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe('StoreRepository integration', () => {
  let storePath: string;
  let repository: StoreRepository;

  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'onui-mcp-test-'));
    tempDirs.push(dir);
    storePath = join(dir, 'store.v1.json');
    repository = new StoreRepository(storePath);
  });

  describe('listPages', () => {
    it('returns empty array for empty store', async () => {
      await setupTestStore(storePath);

      const pages = await repository.listPages();

      expect(pages).toEqual([]);
    });

    it('returns pages with annotation counts', async () => {
      const annotations = [
        createTestAnnotation('1'),
        createTestAnnotation('2'),
      ];
      await setupTestStore(storePath, annotations);

      const pages = await repository.listPages();

      expect(pages).toHaveLength(1);
      expect(pages[0]).toMatchObject({
        url: 'https://example.com/test',
        title: 'Test Page',
        annotationCount: 2,
      });
    });

    it('filters by urlPrefix', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1')]);

      const matching = await repository.listPages({ urlPrefix: 'https://example.com' });
      const notMatching = await repository.listPages({ urlPrefix: 'https://other.com' });

      expect(matching).toHaveLength(1);
      expect(notMatching).toHaveLength(0);
    });

    it('respects limit parameter', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1')]);

      const limited = await repository.listPages({ limit: 0 });

      expect(limited).toHaveLength(0);
    });
  });

  describe('getAnnotations', () => {
    it('returns empty array for non-existent page', async () => {
      await setupTestStore(storePath);

      const annotations = await repository.getAnnotations('https://nonexistent.com');

      expect(annotations).toEqual([]);
    });

    it('returns all annotations for a page', async () => {
      const testAnnotations = [
        createTestAnnotation('1'),
        createTestAnnotation('2'),
        createTestAnnotation('3', { status: 'resolved' }),
      ];
      await setupTestStore(storePath, testAnnotations);

      const annotations = await repository.getAnnotations('https://example.com/test');

      expect(annotations).toHaveLength(3);
    });

    it('filters resolved annotations when includeResolved=false', async () => {
      const testAnnotations = [
        createTestAnnotation('1', { status: 'pending' }),
        createTestAnnotation('2', { status: 'resolved' }),
      ];
      await setupTestStore(storePath, testAnnotations);

      const annotations = await repository.getAnnotations('https://example.com/test', false);

      expect(annotations).toHaveLength(1);
      expect(annotations[0]?.id).toBe('1');
    });

    it('normalizes URL with hash', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1')]);

      const annotations = await repository.getAnnotations('https://example.com/test#section');

      expect(annotations).toHaveLength(1);
    });
  });

  describe('getReport', () => {
    it('returns markdown report for page', async () => {
      await setupTestStore(storePath, [
        createTestAnnotation('1', { comment: 'Fix button styling' }),
      ]);

      const report = await repository.getReport('https://example.com/test');

      expect(report).toContain('Test Page');
      expect(report).toContain('Fix button styling');
    });

    it('returns empty report for non-existent page', async () => {
      await setupTestStore(storePath);

      const report = await repository.getReport('https://nonexistent.com');

      expect(report).toContain('No annotations');
    });
  });

  describe('searchAnnotations', () => {
    it('finds annotations by comment text', async () => {
      await setupTestStore(storePath, [
        createTestAnnotation('1', { comment: 'Fix the login button' }),
        createTestAnnotation('2', { comment: 'Update header styles' }),
      ]);

      const results = await repository.searchAnnotations({ query: 'login' });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('1');
    });

    it('searches case-insensitively', async () => {
      await setupTestStore(storePath, [
        createTestAnnotation('1', { comment: 'Fix the LOGIN button' }),
      ]);

      const results = await repository.searchAnnotations({ query: 'login' });

      expect(results).toHaveLength(1);
    });

    it('filters by status', async () => {
      await setupTestStore(storePath, [
        createTestAnnotation('1', { comment: 'Fix this', status: 'pending' }),
        createTestAnnotation('2', { comment: 'Fix that', status: 'resolved' }),
      ]);

      const results = await repository.searchAnnotations({
        query: 'Fix',
        status: 'pending',
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('1');
    });

    it('filters by severity', async () => {
      await setupTestStore(storePath, [
        createTestAnnotation('1', { comment: 'Issue A', severity: 'blocking' }),
        createTestAnnotation('2', { comment: 'Issue B', severity: 'suggestion' }),
      ]);

      const results = await repository.searchAnnotations({
        query: 'Issue',
        severity: 'blocking',
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('1');
    });

    it('filters by intent', async () => {
      await setupTestStore(storePath, [
        createTestAnnotation('1', { comment: 'Task A', intent: 'fix' }),
        createTestAnnotation('2', { comment: 'Task B', intent: 'change' }),
      ]);

      const results = await repository.searchAnnotations({
        query: 'Task',
        intent: 'fix',
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('1');
    });

    it('respects limit parameter', async () => {
      await setupTestStore(storePath, [
        createTestAnnotation('1', { comment: 'Test comment' }),
        createTestAnnotation('2', { comment: 'Test comment' }),
        createTestAnnotation('3', { comment: 'Test comment' }),
      ]);

      const results = await repository.searchAnnotations({
        query: 'Test',
        limit: 2,
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('updateAnnotationMetadata', () => {
    it('updates annotation status', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1')]);

      const updated = await repository.updateAnnotationMetadata({
        id: '1',
        patch: { status: 'resolved' },
      });

      expect(updated.status).toBe('resolved');
      expect(updated.updatedAt).toBeGreaterThan(1000);
    });

    it('updates multiple fields at once', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1')]);

      const updated = await repository.updateAnnotationMetadata({
        id: '1',
        patch: {
          status: 'acknowledged',
          intent: 'change',
          severity: 'blocking',
          comment: 'Updated comment',
        },
      });

      expect(updated.status).toBe('acknowledged');
      expect(updated.intent).toBe('change');
      expect(updated.severity).toBe('blocking');
      expect(updated.comment).toBe('Updated comment');
    });

    it('throws error for non-existent annotation', async () => {
      await setupTestStore(storePath);

      await expect(
        repository.updateAnnotationMetadata({
          id: 'nonexistent',
          patch: { status: 'resolved' },
        })
      ).rejects.toThrow('Annotation not found');
    });

    it('throws error on optimistic lock conflict', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1', { updatedAt: 2000 })]);

      await expect(
        repository.updateAnnotationMetadata({
          id: '1',
          patch: { status: 'resolved' },
          expectedUpdatedAt: 1000, // Wrong timestamp
        })
      ).rejects.toThrow('Update conflict');
    });

    it('succeeds with correct expectedUpdatedAt', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1', { updatedAt: 1000 })]);

      const updated = await repository.updateAnnotationMetadata({
        id: '1',
        patch: { status: 'resolved' },
        expectedUpdatedAt: 1000,
      });

      expect(updated.status).toBe('resolved');
    });
  });

  describe('bulkUpdateAnnotationMetadata', () => {
    it('updates multiple annotations', async () => {
      await setupTestStore(storePath, [
        createTestAnnotation('1'),
        createTestAnnotation('2'),
        createTestAnnotation('3'),
      ]);

      const updated = await repository.bulkUpdateAnnotationMetadata({
        ids: ['1', '2'],
        patch: { status: 'resolved' },
      });

      expect(updated).toHaveLength(2);
      expect(updated[0]?.status).toBe('resolved');
      expect(updated[1]?.status).toBe('resolved');
    });

    it('persists changes to store', async () => {
      await setupTestStore(storePath, [
        createTestAnnotation('1'),
        createTestAnnotation('2'),
      ]);

      await repository.bulkUpdateAnnotationMetadata({
        ids: ['1', '2'],
        patch: { status: 'dismissed' },
      });

      const annotations = await repository.getAnnotations('https://example.com/test');
      expect(annotations[0]?.status).toBe('dismissed');
      expect(annotations[1]?.status).toBe('dismissed');
    });

    it('throws error if any annotation not found', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1')]);

      await expect(
        repository.bulkUpdateAnnotationMetadata({
          ids: ['1', 'nonexistent'],
          patch: { status: 'resolved' },
        })
      ).rejects.toThrow('Annotation not found');
    });
  });

  describe('getChangesSince', () => {
    it('returns empty changes for fresh store', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1')]);

      const { changes } = await repository.getChangesSince();

      expect(changes).toEqual([]);
    });

    it('returns changes after metadata update', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1')]);
      await repository.updateAnnotationMetadata({
        id: '1',
        patch: { status: 'resolved' },
      });

      const { changes, latest } = await repository.getChangesSince(0);

      expect(changes).toHaveLength(1);
      expect(changes[0]?.annotationId).toBe('1');
      expect(changes[0]?.patch.status).toBe('resolved');
      expect(latest).toBeGreaterThan(0);
    });

    it('filters changes by since timestamp', async () => {
      await setupTestStore(storePath, [createTestAnnotation('1')]);
      await repository.updateAnnotationMetadata({
        id: '1',
        patch: { status: 'acknowledged' },
      });

      const { changes: allChanges } = await repository.getChangesSince(0);
      const { changes: noChanges } = await repository.getChangesSince(Date.now() + 1000);

      expect(allChanges).toHaveLength(1);
      expect(noChanges).toHaveLength(0);
    });
  });
});
