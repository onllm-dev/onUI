import type { Annotation, Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  ANNOTATIONS: 'onui_annotations',
  ANNOTATION_INDEX: 'onui_annotation_index',
  SETTINGS: 'onui_settings',
} as const;

/**
 * Service for Chrome storage operations
 */
export class StorageService {
  /**
   * Build annotation ID index from all stored annotations
   */
  private buildAnnotationIndex(allAnnotations: Record<string, Annotation[]>): Record<string, string> {
    const index: Record<string, string> = {};

    for (const [url, annotations] of Object.entries(allAnnotations)) {
      for (const annotation of annotations) {
        index[annotation.id] = url;
      }
    }

    return index;
  }

  /**
   * Keep annotation ID index in sync for a URL's annotation list
   */
  private updateIndexForUrl(
    index: Record<string, string>,
    normalizedUrl: string,
    annotations: Annotation[]
  ): Record<string, string> {
    const nextIndex = { ...index };

    for (const [annotationId, url] of Object.entries(nextIndex)) {
      if (url === normalizedUrl) {
        delete nextIndex[annotationId];
      }
    }

    for (const annotation of annotations) {
      nextIndex[annotation.id] = normalizedUrl;
    }

    return nextIndex;
  }

  /**
   * Get all annotations for a specific URL
   */
  async getAnnotations(url: string): Promise<Annotation[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ANNOTATIONS);
    const allAnnotations = (result[STORAGE_KEYS.ANNOTATIONS] ?? {}) as Record<string, Annotation[]>;
    return allAnnotations[this.normalizeUrl(url)] ?? [];
  }

  /**
   * Save annotations for a specific URL
   */
  async setAnnotations(url: string, annotations: Annotation[]): Promise<void> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.ANNOTATIONS,
      STORAGE_KEYS.ANNOTATION_INDEX,
    ]);
    const allAnnotations = (result[STORAGE_KEYS.ANNOTATIONS] ?? {}) as Record<string, Annotation[]>;
    const existingIndex = result[STORAGE_KEYS.ANNOTATION_INDEX] as Record<string, string> | undefined;
    const currentIndex = existingIndex ?? this.buildAnnotationIndex(allAnnotations);

    const normalizedUrl = this.normalizeUrl(url);

    if (annotations.length === 0) {
      delete allAnnotations[normalizedUrl];
    } else {
      allAnnotations[normalizedUrl] = annotations;
    }

    const nextIndex = this.updateIndexForUrl(currentIndex, normalizedUrl, annotations);

    await chrome.storage.local.set({
      [STORAGE_KEYS.ANNOTATIONS]: allAnnotations,
      [STORAGE_KEYS.ANNOTATION_INDEX]: nextIndex,
    });
  }

  /**
   * Get all annotations across all URLs
   */
  async getAllAnnotations(): Promise<Record<string, Annotation[]>> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ANNOTATIONS);
    return (result[STORAGE_KEYS.ANNOTATIONS] ?? {}) as Record<string, Annotation[]>;
  }

  /**
   * Resolve annotation ID to normalized URL
   */
  async getAnnotationUrlById(id: string): Promise<string | null> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.ANNOTATIONS,
      STORAGE_KEYS.ANNOTATION_INDEX,
    ]);
    const allAnnotations = (result[STORAGE_KEYS.ANNOTATIONS] ?? {}) as Record<string, Annotation[]>;
    const existingIndex = result[STORAGE_KEYS.ANNOTATION_INDEX] as Record<string, string> | undefined;
    const index = existingIndex ?? this.buildAnnotationIndex(allAnnotations);

    if (existingIndex === undefined) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.ANNOTATION_INDEX]: index,
      });
    }

    return index[id] ?? null;
  }

  /**
   * Get settings
   */
  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = result[STORAGE_KEYS.SETTINGS] as Partial<Settings> | undefined;
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  /**
   * Update settings
   */
  async updateSettings(update: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated = { ...current, ...update };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    return updated;
  }

  /**
   * Normalize URL for storage key (remove hash, trailing slash)
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove hash and trailing slash
      return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`;
    } catch {
      return url;
    }
  }
}

// Singleton instance
export const storageService = new StorageService();
