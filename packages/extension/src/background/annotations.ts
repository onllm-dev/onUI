import type { Annotation, AnnotationInput, AnnotationUpdate } from '@/types';
import { storageService } from './storage';

const LOG_PREFIX = '[onUI][background][annotations]';

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
      const tabs = await chrome.tabs.query({ url });

      for (const tab of tabs) {
        if (tab.id === undefined) continue;

        if (count > 0) {
          await chrome.action.setBadgeText({
            text: count.toString(),
            tabId: tab.id,
          });
          await chrome.action.setBadgeBackgroundColor({
            color: '#6366f1',
            tabId: tab.id,
          });
        } else {
          await chrome.action.setBadgeText({
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
