import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Annotation, OutputLevel } from '@onui/core';
import type { StoreRepository } from '../../store/repository.js';
import { runListPagesTool } from './list-pages.js';
import { runGetAnnotationsTool } from './get-annotations.js';
import { runGetReportTool } from './get-report.js';
import { runSearchAnnotationsTool } from './search-annotations.js';
import { runUpdateAnnotationMetadataTool } from './update-annotation-metadata.js';
import { runBulkUpdateAnnotationMetadataTool } from './bulk-update-annotation-metadata.js';

function createMockAnnotation(id: string, overrides: Partial<Annotation> = {}): Annotation {
  return {
    id,
    selector: `#element-${id}`,
    elementPath: `div > #element-${id}`,
    tagName: 'button',
    comment: `Comment for ${id}`,
    boundingBox: {
      top: 100,
      left: 200,
      width: 150,
      height: 50,
      isFixed: false,
    },
    createdAt: 1000,
    updatedAt: 1000,
    pageUrl: 'https://example.com/page',
    pageTitle: 'Example Page',
    attributes: { class: 'btn' },
    status: 'pending',
    intent: 'fix',
    severity: 'important',
    ...overrides,
  };
}

function createMockRepository(overrides: Partial<StoreRepository> = {}): StoreRepository {
  return {
    read: vi.fn(),
    upsertPageSnapshot: vi.fn(),
    deletePageSnapshot: vi.fn(),
    listPages: vi.fn().mockResolvedValue([]),
    getAnnotations: vi.fn().mockResolvedValue([]),
    getReport: vi.fn().mockResolvedValue(''),
    searchAnnotations: vi.fn().mockResolvedValue([]),
    updateAnnotationMetadata: vi.fn(),
    bulkUpdateAnnotationMetadata: vi.fn(),
    getChangesSince: vi.fn(),
    ...overrides,
  } as unknown as StoreRepository;
}

describe('runListPagesTool', () => {
  it('returns pages from repository', async () => {
    const mockPages = [
      { url: 'https://example.com/a', title: 'Page A', updatedAt: 2000, annotationCount: 3 },
      { url: 'https://example.com/b', title: 'Page B', updatedAt: 1000, annotationCount: 1 },
    ];
    const repository = createMockRepository({
      listPages: vi.fn().mockResolvedValue(mockPages),
    });

    const result = await runListPagesTool(repository, {});

    expect(repository.listPages).toHaveBeenCalledWith({
      limit: undefined,
      urlPrefix: undefined,
    });
    expect(result).toEqual(mockPages);
  });

  it('passes limit parameter to repository', async () => {
    const repository = createMockRepository();

    await runListPagesTool(repository, { limit: 10 });

    expect(repository.listPages).toHaveBeenCalledWith({
      limit: 10,
      urlPrefix: undefined,
    });
  });

  it('passes urlPrefix parameter to repository', async () => {
    const repository = createMockRepository();

    await runListPagesTool(repository, { urlPrefix: 'https://example.com' });

    expect(repository.listPages).toHaveBeenCalledWith({
      limit: undefined,
      urlPrefix: 'https://example.com',
    });
  });

  it('passes both limit and urlPrefix parameters', async () => {
    const repository = createMockRepository();

    await runListPagesTool(repository, { limit: 5, urlPrefix: 'https://test.com' });

    expect(repository.listPages).toHaveBeenCalledWith({
      limit: 5,
      urlPrefix: 'https://test.com',
    });
  });
});

describe('runGetAnnotationsTool', () => {
  it('returns annotations for a page', async () => {
    const mockAnnotations = [
      createMockAnnotation('1'),
      createMockAnnotation('2'),
    ];
    const repository = createMockRepository({
      getAnnotations: vi.fn().mockResolvedValue(mockAnnotations),
    });

    const result = await runGetAnnotationsTool(repository, {
      pageUrl: 'https://example.com/page',
    });

    expect(repository.getAnnotations).toHaveBeenCalledWith(
      'https://example.com/page',
      true
    );
    expect(result).toEqual(mockAnnotations);
  });

  it('throws error when pageUrl is empty', async () => {
    const repository = createMockRepository();

    await expect(
      runGetAnnotationsTool(repository, { pageUrl: '' })
    ).rejects.toThrow('pageUrl is required');
  });

  it('passes includeResolved=false to repository', async () => {
    const repository = createMockRepository();

    await runGetAnnotationsTool(repository, {
      pageUrl: 'https://example.com/page',
      includeResolved: false,
    });

    expect(repository.getAnnotations).toHaveBeenCalledWith(
      'https://example.com/page',
      false
    );
  });

  it('defaults includeResolved to true when not provided', async () => {
    const repository = createMockRepository();

    await runGetAnnotationsTool(repository, {
      pageUrl: 'https://example.com/page',
    });

    expect(repository.getAnnotations).toHaveBeenCalledWith(
      'https://example.com/page',
      true
    );
  });
});

describe('runGetReportTool', () => {
  it('returns report for a page', async () => {
    const mockReport = '# Page Report\n\n## Annotation 1\nComment here';
    const repository = createMockRepository({
      getReport: vi.fn().mockResolvedValue(mockReport),
    });

    const result = await runGetReportTool(repository, {
      pageUrl: 'https://example.com/page',
    });

    expect(repository.getReport).toHaveBeenCalledWith(
      'https://example.com/page',
      'standard'
    );
    expect(result).toBe(mockReport);
  });

  it('throws error when pageUrl is empty', async () => {
    const repository = createMockRepository();

    await expect(
      runGetReportTool(repository, { pageUrl: '' })
    ).rejects.toThrow('pageUrl is required');
  });

  it('passes custom level to repository', async () => {
    const repository = createMockRepository();

    await runGetReportTool(repository, {
      pageUrl: 'https://example.com/page',
      level: 'detailed',
    });

    expect(repository.getReport).toHaveBeenCalledWith(
      'https://example.com/page',
      'detailed'
    );
  });

  it.each<OutputLevel>(['compact', 'standard', 'detailed', 'forensic'])(
    'supports level=%s',
    async (level) => {
      const repository = createMockRepository();

      await runGetReportTool(repository, {
        pageUrl: 'https://example.com/page',
        level,
      });

      expect(repository.getReport).toHaveBeenCalledWith(
        'https://example.com/page',
        level
      );
    }
  );

  it('defaults to standard level when not provided', async () => {
    const repository = createMockRepository();

    await runGetReportTool(repository, {
      pageUrl: 'https://example.com/page',
    });

    expect(repository.getReport).toHaveBeenCalledWith(
      'https://example.com/page',
      'standard'
    );
  });
});

describe('runSearchAnnotationsTool', () => {
  it('returns matching annotations', async () => {
    const mockAnnotations = [
      createMockAnnotation('1', { comment: 'Fix this button' }),
      createMockAnnotation('2', { comment: 'Fix this form' }),
    ];
    const repository = createMockRepository({
      searchAnnotations: vi.fn().mockResolvedValue(mockAnnotations),
    });

    const result = await runSearchAnnotationsTool(repository, {
      query: 'Fix this',
    });

    expect(repository.searchAnnotations).toHaveBeenCalledWith({
      query: 'Fix this',
      pageUrl: undefined,
      status: undefined,
      severity: undefined,
      intent: undefined,
      limit: undefined,
    });
    expect(result).toEqual(mockAnnotations);
  });

  it('throws error when query is empty', async () => {
    const repository = createMockRepository();

    await expect(
      runSearchAnnotationsTool(repository, { query: '' })
    ).rejects.toThrow('query is required');
  });

  it('throws error when query is only whitespace', async () => {
    const repository = createMockRepository();

    await expect(
      runSearchAnnotationsTool(repository, { query: '   ' })
    ).rejects.toThrow('query is required');
  });

  it('trims query before passing to repository', async () => {
    const repository = createMockRepository();

    await runSearchAnnotationsTool(repository, {
      query: '  button  ',
    });

    expect(repository.searchAnnotations).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'button' })
    );
  });

  it('passes all filter parameters', async () => {
    const repository = createMockRepository();

    await runSearchAnnotationsTool(repository, {
      query: 'test',
      pageUrl: 'https://example.com/page',
      status: 'pending',
      severity: 'blocking',
      intent: 'fix',
      limit: 50,
    });

    expect(repository.searchAnnotations).toHaveBeenCalledWith({
      query: 'test',
      pageUrl: 'https://example.com/page',
      status: 'pending',
      severity: 'blocking',
      intent: 'fix',
      limit: 50,
    });
  });
});

describe('runUpdateAnnotationMetadataTool', () => {
  it('updates annotation metadata', async () => {
    const updatedAnnotation = createMockAnnotation('1', {
      status: 'resolved',
      updatedAt: 2000,
    });
    const repository = createMockRepository({
      updateAnnotationMetadata: vi.fn().mockResolvedValue(updatedAnnotation),
    });

    const result = await runUpdateAnnotationMetadataTool(repository, {
      id: '1',
      status: 'resolved',
    });

    expect(repository.updateAnnotationMetadata).toHaveBeenCalledWith({
      id: '1',
      patch: { status: 'resolved' },
      expectedUpdatedAt: undefined,
    });
    expect(result).toEqual(updatedAnnotation);
  });

  it('throws error when id is empty', async () => {
    const repository = createMockRepository();

    await expect(
      runUpdateAnnotationMetadataTool(repository, { id: '' })
    ).rejects.toThrow('id is required');
  });

  it('passes all metadata fields', async () => {
    const repository = createMockRepository({
      updateAnnotationMetadata: vi.fn().mockResolvedValue(createMockAnnotation('1')),
    });

    await runUpdateAnnotationMetadataTool(repository, {
      id: '1',
      status: 'acknowledged',
      intent: 'change',
      severity: 'suggestion',
      comment: 'Updated comment',
    });

    expect(repository.updateAnnotationMetadata).toHaveBeenCalledWith({
      id: '1',
      patch: {
        status: 'acknowledged',
        intent: 'change',
        severity: 'suggestion',
        comment: 'Updated comment',
      },
      expectedUpdatedAt: undefined,
    });
  });

  it('passes expectedUpdatedAt for optimistic locking', async () => {
    const repository = createMockRepository({
      updateAnnotationMetadata: vi.fn().mockResolvedValue(createMockAnnotation('1')),
    });

    await runUpdateAnnotationMetadataTool(repository, {
      id: '1',
      status: 'resolved',
      expectedUpdatedAt: 1500,
    });

    expect(repository.updateAnnotationMetadata).toHaveBeenCalledWith({
      id: '1',
      patch: { status: 'resolved' },
      expectedUpdatedAt: 1500,
    });
  });

  it('only includes provided fields in patch', async () => {
    const repository = createMockRepository({
      updateAnnotationMetadata: vi.fn().mockResolvedValue(createMockAnnotation('1')),
    });

    await runUpdateAnnotationMetadataTool(repository, {
      id: '1',
      comment: 'Only updating comment',
    });

    expect(repository.updateAnnotationMetadata).toHaveBeenCalledWith({
      id: '1',
      patch: { comment: 'Only updating comment' },
      expectedUpdatedAt: undefined,
    });
  });

  it('includes comment when explicitly set to empty string', async () => {
    const repository = createMockRepository({
      updateAnnotationMetadata: vi.fn().mockResolvedValue(createMockAnnotation('1')),
    });

    await runUpdateAnnotationMetadataTool(repository, {
      id: '1',
      comment: '',
    });

    expect(repository.updateAnnotationMetadata).toHaveBeenCalledWith({
      id: '1',
      patch: { comment: '' },
      expectedUpdatedAt: undefined,
    });
  });
});

describe('runBulkUpdateAnnotationMetadataTool', () => {
  it('updates multiple annotations', async () => {
    const updatedAnnotations = [
      createMockAnnotation('1', { status: 'resolved' }),
      createMockAnnotation('2', { status: 'resolved' }),
    ];
    const repository = createMockRepository({
      bulkUpdateAnnotationMetadata: vi.fn().mockResolvedValue(updatedAnnotations),
    });

    const result = await runBulkUpdateAnnotationMetadataTool(repository, {
      ids: ['1', '2'],
      patch: { status: 'resolved' },
    });

    expect(repository.bulkUpdateAnnotationMetadata).toHaveBeenCalledWith({
      ids: ['1', '2'],
      patch: { status: 'resolved' },
    });
    expect(result).toEqual(updatedAnnotations);
  });

  it('throws error when ids is empty array', async () => {
    const repository = createMockRepository();

    await expect(
      runBulkUpdateAnnotationMetadataTool(repository, {
        ids: [],
        patch: { status: 'resolved' },
      })
    ).rejects.toThrow('ids must be a non-empty array');
  });

  it('throws error when ids is not an array', async () => {
    const repository = createMockRepository();

    await expect(
      runBulkUpdateAnnotationMetadataTool(repository, {
        ids: 'not-an-array' as unknown as string[],
        patch: { status: 'resolved' },
      })
    ).rejects.toThrow('ids must be a non-empty array');
  });

  it('passes all patch fields', async () => {
    const repository = createMockRepository({
      bulkUpdateAnnotationMetadata: vi.fn().mockResolvedValue([]),
    });

    await runBulkUpdateAnnotationMetadataTool(repository, {
      ids: ['1', '2', '3'],
      patch: {
        status: 'dismissed',
        intent: 'approve',
        severity: 'blocking',
      },
    });

    expect(repository.bulkUpdateAnnotationMetadata).toHaveBeenCalledWith({
      ids: ['1', '2', '3'],
      patch: {
        status: 'dismissed',
        intent: 'approve',
        severity: 'blocking',
      },
    });
  });

  it('handles single id in array', async () => {
    const repository = createMockRepository({
      bulkUpdateAnnotationMetadata: vi.fn().mockResolvedValue([createMockAnnotation('1')]),
    });

    await runBulkUpdateAnnotationMetadataTool(repository, {
      ids: ['1'],
      patch: { status: 'acknowledged' },
    });

    expect(repository.bulkUpdateAnnotationMetadata).toHaveBeenCalledWith({
      ids: ['1'],
      patch: { status: 'acknowledged' },
    });
  });

  it('handles empty patch object', async () => {
    const repository = createMockRepository({
      bulkUpdateAnnotationMetadata: vi.fn().mockResolvedValue([]),
    });

    await runBulkUpdateAnnotationMetadataTool(repository, {
      ids: ['1', '2'],
      patch: {},
    });

    expect(repository.bulkUpdateAnnotationMetadata).toHaveBeenCalledWith({
      ids: ['1', '2'],
      patch: {},
    });
  });
});
