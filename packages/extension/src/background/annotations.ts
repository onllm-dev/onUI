import type { Annotation, AnnotationInput, AnnotationUpdate } from '@/types';
import { webext } from '@/shared/webext';
import { storageService } from './storage';
import {
  deletePageSnapshotFromNativeHost,
  syncPageSnapshotWithNativeHost,
} from './native-sync';

const LOG_PREFIX = '[onUI][background][annotations]';
const MAX_BULK_ANNOTATIONS = 25;

/**
 * Generate a unique ID for annotations
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Manager for annotation CRUD operations
 */
export class AnnotationManager {
  /**
   * Get all annotations for a URL
   */
  async getAnnotations(url: string): Promise<Annotation[]> {
    const startedAt = Date.now();
    const annotations = await storageService.getAnnotations(url);
    console.log(`${LOG_PREFIX} getAnnotations`, {
      url,
      count: annotations.length,
      durationMs: Date.now() - startedAt,
    });
    return annotations;
  }

  /**
   * Create a new annotation
   */
  async createAnnotation(input: AnnotationInput): Promise<Annotation> {
    const startedAt = Date.now();
    const annotations = await storageService.getAnnotations(input.pageUrl);

    const annotation: Annotation = {
      ...input,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    annotations.push(annotation);
    await storageService.setAnnotations(input.pageUrl, annotations);
    await syncPageSnapshotWithNativeHost(input.pageUrl, annotations);

    // Update badge
    await this.updateBadge(input.pageUrl, annotations.length);

    console.log(`${LOG_PREFIX} createAnnotation`, {
      annotationId: annotation.id,
      pageUrl: input.pageUrl,
      totalForUrl: annotations.length,
      durationMs: Date.now() - startedAt,
    });

    return annotation;
  }

  /**
   * Create multiple annotations in a single write/sync operation
   */
  async createAnnotationsBulk(inputs: AnnotationInput[]): Promise<Annotation[]> {
    const startedAt = Date.now();

    if (inputs.length === 0) {
      throw new Error('No annotation inputs provided');
    }

    if (inputs.length > MAX_BULK_ANNOTATIONS) {
      throw new Error(`Cannot create more than ${MAX_BULK_ANNOTATIONS} annotations at once`);
    }

    const pageUrl = inputs[0]?.pageUrl;
    if (!pageUrl) {
      throw new Error('Missing pageUrl in annotation input');
    }

    if (!inputs.every((input) => input.pageUrl === pageUrl)) {
      throw new Error('Bulk annotations must target the same pageUrl');
    }

    const annotations = await storageService.getAnnotations(pageUrl);
    const now = Date.now();

    const createdAnnotations: Annotation[] = inputs.map((input, index) => ({
      ...input,
      id: generateId(),
      createdAt: now + index,
      updatedAt: now + index,
    }));

    annotations.push(...createdAnnotations);
    await storageService.setAnnotations(pageUrl, annotations);
    await syncPageSnapshotWithNativeHost(pageUrl, annotations);

    // Update badge
    await this.updateBadge(pageUrl, annotations.length);

    console.log(`${LOG_PREFIX} createAnnotationsBulk`, {
      pageUrl,
      createdCount: createdAnnotations.length,
      totalForUrl: annotations.length,
      durationMs: Date.now() - startedAt,
    });

    return createdAnnotations;
  }

  /**
   * Update an existing annotation
   */
  async updateAnnotation(
    id: string,
    update: AnnotationUpdate,
    requestId?: string
  ): Promise<Annotation | null> {
    const startedAt = Date.now();

    const url = await storageService.getAnnotationUrlById(id);
    if (!url) {
      console.warn(`${LOG_PREFIX} updateAnnotation miss`, {
        requestId,
        annotationId: id,
        lookup: 'index-miss',
        durationMs: Date.now() - startedAt,
      });
      return null;
    }

    const annotations = await storageService.getAnnotations(url);
    const index = annotations.findIndex((annotation) => annotation.id === id);

    if (index === -1) {
      console.warn(`${LOG_PREFIX} updateAnnotation miss`, {
        requestId,
        annotationId: id,
        url,
        lookup: 'url-hit-annotation-miss',
        urlAnnotationCount: annotations.length,
        durationMs: Date.now() - startedAt,
      });
      return null;
    }

    const existing = annotations[index];
    if (!existing) {
      console.warn(`${LOG_PREFIX} updateAnnotation miss`, {
        requestId,
        annotationId: id,
        url,
        lookup: 'index-hit-empty-slot',
        durationMs: Date.now() - startedAt,
      });
      return null;
    }

    const updated: Annotation = {
      ...existing,
      ...update,
      updatedAt: Date.now(),
    };

    annotations[index] = updated;
    await storageService.setAnnotations(url, annotations);
    await syncPageSnapshotWithNativeHost(url, annotations);

    console.log(`${LOG_PREFIX} updateAnnotation hit`, {
      requestId,
      annotationId: id,
      url,
      urlAnnotationCount: annotations.length,
      durationMs: Date.now() - startedAt,
    });

    return updated;
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(id: string, requestId?: string): Promise<boolean> {
    const startedAt = Date.now();

    const url = await storageService.getAnnotationUrlById(id);
    if (!url) {
      console.warn(`${LOG_PREFIX} deleteAnnotation miss`, {
        requestId,
        annotationId: id,
        lookup: 'index-miss',
        durationMs: Date.now() - startedAt,
      });
      return false;
    }

    const annotations = await storageService.getAnnotations(url);
    const index = annotations.findIndex((annotation) => annotation.id === id);

    if (index === -1) {
      console.warn(`${LOG_PREFIX} deleteAnnotation miss`, {
        requestId,
        annotationId: id,
        url,
        lookup: 'url-hit-annotation-miss',
        urlAnnotationCount: annotations.length,
        durationMs: Date.now() - startedAt,
      });
      return false;
    }

    annotations.splice(index, 1);
    await storageService.setAnnotations(url, annotations);
    if (annotations.length === 0) {
      await deletePageSnapshotFromNativeHost(url);
    } else {
      await syncPageSnapshotWithNativeHost(url, annotations);
    }

    // Update badge
    await this.updateBadge(url, annotations.length);

    console.log(`${LOG_PREFIX} deleteAnnotation hit`, {
      requestId,
      annotationId: id,
      url,
      remainingForUrl: annotations.length,
      durationMs: Date.now() - startedAt,
    });

    return true;
  }

  /**
   * Clear all annotations for a URL
   */
  async clearAnnotations(url: string, requestId?: string): Promise<void> {
    const startedAt = Date.now();
    const before = await storageService.getAnnotations(url);

    await storageService.setAnnotations(url, []);
    await deletePageSnapshotFromNativeHost(url);
    await this.updateBadge(url, 0);

    console.log(`${LOG_PREFIX} clearAnnotations`, {
      requestId,
      url,
      removedCount: before.length,
      durationMs: Date.now() - startedAt,
    });
  }

  /**
   * Update the extension badge with annotation count
   */
  private async updateBadge(url: string, count: number): Promise<void> {
    const startedAt = Date.now();

    try {
      // Find tabs with this URL
      const tabs = await webext.tabs.query({ url });

      for (const tab of tabs) {
        if (tab.id === undefined) continue;

        if (count > 0) {
          await webext.action.setBadgeText({
            text: count.toString(),
            tabId: tab.id,
          });
          await webext.action.setBadgeBackgroundColor({
            color: '#6366f1',
            tabId: tab.id,
          });
        } else {
          await webext.action.setBadgeText({
            text: '',
            tabId: tab.id,
          });
        }
      }

      console.log(`${LOG_PREFIX} updateBadge`, {
        url,
        count,
        tabsMatched: tabs.length,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      console.error('[onUI] Failed to update badge:', error);
    }
  }
}

// Singleton instance
export const annotationManager = new AnnotationManager();
