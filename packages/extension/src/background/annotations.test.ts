import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Annotation } from '@/types';
import { AnnotationManager } from './annotations';
import { storageService } from './storage';
import { getNativeSyncStatus } from './native-sync';

vi.mock('./storage', () => ({
  storageService: {
    getAnnotations: vi.fn(),
    setAnnotations: vi.fn(),
    getAnnotationUrlById: vi.fn(),
  },
}));

describe('AnnotationManager bridge-down behavior', () => {
  const manager = new AnnotationManager();
  const sendNativeMessageMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(globalThis, 'chrome', {
      value: {
        tabs: {
          query: vi.fn().mockResolvedValue([]),
        },
        action: {
          setBadgeText: vi.fn().mockResolvedValue(undefined),
          setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
        },
        runtime: {
          sendNativeMessage: sendNativeMessageMock,
        },
      },
      configurable: true,
    });
  });

  it('createAnnotation succeeds locally when native host is unavailable', async () => {
    const pageUrl = 'https://example.com/page';
    vi.mocked(storageService.getAnnotations).mockResolvedValue([]);
    vi.mocked(storageService.setAnnotations).mockResolvedValue(undefined);
    sendNativeMessageMock.mockRejectedValue(new Error('Specified native messaging host not found'));

    const created = await manager.createAnnotation({
      selector: '#hero',
      elementPath: 'body > main > #hero',
      tagName: 'div',
      comment: 'Add spacing',
      pageUrl,
      pageTitle: 'Example',
      attributes: {},
      boundingBox: {
        top: 12,
        left: 8,
        width: 100,
        height: 40,
        isFixed: false,
      },
    });

    expect(created.id).toBeTruthy();
    expect(created.pageUrl).toBe(pageUrl);
    expect(storageService.setAnnotations).toHaveBeenCalledTimes(1);
    const [savedCreateUrl, savedCreateAnnotations] = vi.mocked(storageService.setAnnotations).mock.calls[0] ?? [];
    expect(savedCreateUrl).toBe(pageUrl);
    expect(savedCreateAnnotations).toHaveLength(1);
    expect(savedCreateAnnotations?.[0]).toMatchObject({
      pageUrl,
      comment: 'Add spacing',
      selector: '#hero',
      elementPath: 'body > main > #hero',
      tagName: 'div',
      attributes: {},
      boundingBox: {
        top: 12,
        left: 8,
        width: 100,
        height: 40,
        isFixed: false,
      },
    });
    expect(savedCreateAnnotations?.[0]?.id).toBe(created.id);
    expect(savedCreateAnnotations?.[0]?.createdAt).toBe(created.createdAt);
    expect(savedCreateAnnotations?.[0]?.updatedAt).toBe(created.updatedAt);
    expect(sendNativeMessageMock).toHaveBeenCalledTimes(1);
    const createSyncStatus = getNativeSyncStatus();
    expect(createSyncStatus.status).toBe('unavailable');
    expect(createSyncStatus.lastError).toContain('Specified native messaging host not found');
  });

  it('updateAnnotation succeeds locally when native sync errors', async () => {
    const pageUrl = 'https://example.com/page';
    const existing: Annotation = {
      id: 'annotation-1',
      selector: '#hero',
      elementPath: 'body > main > #hero',
      tagName: 'div',
      comment: 'Initial',
      pageUrl,
      pageTitle: 'Example',
      attributes: {},
      boundingBox: {
        top: 12,
        left: 8,
        width: 100,
        height: 40,
        isFixed: false,
      },
      createdAt: 1,
      updatedAt: 1,
    };

    vi.mocked(storageService.getAnnotationUrlById).mockResolvedValue(pageUrl);
    vi.mocked(storageService.getAnnotations).mockResolvedValue([existing]);
    vi.mocked(storageService.setAnnotations).mockResolvedValue(undefined);
    sendNativeMessageMock.mockRejectedValue(new Error('Native host request failed'));

    const updated = await manager.updateAnnotation('annotation-1', { comment: 'Updated comment' }, 'request-1');

    expect(updated).toBeTruthy();
    expect(updated?.comment).toBe('Updated comment');
    expect(storageService.setAnnotations).toHaveBeenCalledTimes(1);
    const [savedUpdateUrl, savedUpdateAnnotations] = vi.mocked(storageService.setAnnotations).mock.calls[0] ?? [];
    expect(savedUpdateUrl).toBe(pageUrl);
    expect(savedUpdateAnnotations).toHaveLength(1);
    expect(savedUpdateAnnotations?.[0]).toMatchObject({
      id: 'annotation-1',
      pageUrl,
      comment: 'Updated comment',
      selector: '#hero',
      elementPath: 'body > main > #hero',
      tagName: 'div',
      createdAt: 1,
    });
    expect(savedUpdateAnnotations?.[0]?.updatedAt).toBe(updated?.updatedAt);
    expect(savedUpdateAnnotations?.[0]?.updatedAt).not.toBe(1);
    expect(sendNativeMessageMock).toHaveBeenCalledTimes(1);
    const updateSyncStatus = getNativeSyncStatus();
    expect(updateSyncStatus.status).toBe('error');
    expect(updateSyncStatus.lastError).toContain('Native host request failed');
  });

  it('deleteAnnotation succeeds locally when native host is unavailable', async () => {
    const pageUrl = 'https://example.com/page';
    const existing: Annotation = {
      id: 'annotation-1',
      selector: '#hero',
      elementPath: 'body > main > #hero',
      tagName: 'div',
      comment: 'Initial',
      pageUrl,
      pageTitle: 'Example',
      attributes: {},
      boundingBox: {
        top: 12,
        left: 8,
        width: 100,
        height: 40,
        isFixed: false,
      },
      createdAt: 1,
      updatedAt: 1,
    };

    vi.mocked(storageService.getAnnotationUrlById).mockResolvedValue(pageUrl);
    vi.mocked(storageService.getAnnotations).mockResolvedValue([existing]);
    vi.mocked(storageService.setAnnotations).mockResolvedValue(undefined);
    sendNativeMessageMock.mockRejectedValue(new Error('Specified native messaging host not found'));

    const deleted = await manager.deleteAnnotation('annotation-1', 'request-2');

    expect(deleted).toBe(true);
    expect(storageService.setAnnotations).toHaveBeenCalledTimes(1);
    expect(storageService.setAnnotations).toHaveBeenCalledWith(pageUrl, []);
    const [savedDeleteUrl, savedDeleteAnnotations] = vi.mocked(storageService.setAnnotations).mock.calls[0] ?? [];
    expect(savedDeleteUrl).toBe(pageUrl);
    expect(savedDeleteAnnotations).toEqual([]);
    expect(sendNativeMessageMock).toHaveBeenCalledTimes(1);
    const deleteSyncStatus = getNativeSyncStatus();
    expect(deleteSyncStatus.status).toBe('unavailable');
    expect(deleteSyncStatus.lastError).toContain('Specified native messaging host not found');
  });
});
