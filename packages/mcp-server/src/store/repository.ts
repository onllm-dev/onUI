import type { Annotation, OutputLevel, ReportContext } from '@onui/core';
import { generateReport } from '@onui/core';
import { readStore, withStore } from './io.js';
import {
  deletePageSnapshot,
  getChangesSince,
  normalizeUrl,
  type MetadataPatch,
  type StoreSnapshot,
  type UpsertPageSnapshotInput,
  updateAnnotationMetadata,
  upsertPageSnapshot,
} from './schema.js';

export interface ListPagesInput {
  limit?: number | undefined;
  urlPrefix?: string | undefined;
}

export interface SearchAnnotationsInput {
  query: string;
  pageUrl?: string | undefined;
  status?: string | undefined;
  severity?: string | undefined;
  intent?: string | undefined;
  limit?: number | undefined;
}

export interface UpdateAnnotationInput {
  id: string;
  patch: MetadataPatch;
  expectedUpdatedAt?: number | undefined;
}

export interface BulkUpdateInput {
  ids: string[];
  patch: MetadataPatch;
}

export class StoreRepository {
  constructor(private readonly storePath: string) {}

  async read(): Promise<StoreSnapshot> {
    return readStore(this.storePath);
  }

  async upsertPageSnapshot(input: UpsertPageSnapshotInput): Promise<{ pageUrl: string; annotationCount: number }> {
    const normalizedUrl = normalizeUrl(input.pageUrl);

    return withStore(this.storePath, async (store) => {
      const next = upsertPageSnapshot(store, input);
      return {
        store: next,
        result: {
          pageUrl: normalizedUrl,
          annotationCount: input.annotations.length,
        },
      };
    });
  }

  async deletePageSnapshot(pageUrl: string): Promise<{ pageUrl: string }> {
    const normalizedUrl = normalizeUrl(pageUrl);
    return withStore(this.storePath, async (store) => {
      const next = deletePageSnapshot(store, normalizedUrl);
      return {
        store: next,
        result: { pageUrl: normalizedUrl },
      };
    });
  }

  async listPages(input: ListPagesInput = {}): Promise<Array<{ url: string; title: string; updatedAt: number; annotationCount: number }>> {
    const store = await this.read();
    const allPages = Object.values(store.pages)
      .filter((page) => (input.urlPrefix ? page.url.startsWith(input.urlPrefix) : true))
      .map((page) => ({
        url: page.url,
        title: page.title,
        updatedAt: page.updatedAt,
        annotationCount: page.annotationIds.length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return allPages.slice(0, input.limit ?? 200);
  }

  async getAnnotations(pageUrl: string, includeResolved = true): Promise<Annotation[]> {
    const store = await this.read();
    const normalizedUrl = normalizeUrl(pageUrl);
    const page = store.pages[normalizedUrl];
    if (!page) {
      return [];
    }

    return page.annotationIds
      .map((id) => store.annotationsById[id])
      .filter((annotation): annotation is Annotation => Boolean(annotation))
      .filter((annotation) => (includeResolved ? true : annotation.status !== 'resolved'));
  }

  async getReport(pageUrl: string, level: OutputLevel = 'standard'): Promise<string> {
    const annotations = await this.getAnnotations(pageUrl, true);
    const store = await this.read();
    const normalizedUrl = normalizeUrl(pageUrl);
    const page = store.pages[normalizedUrl];
    const context: ReportContext = {
      url: normalizedUrl,
      title: page?.title ?? normalizedUrl,
      timestamp: new Date().toISOString(),
    };

    return generateReport(annotations, level, context);
  }

  async searchAnnotations(input: SearchAnnotationsInput): Promise<Annotation[]> {
    const store = await this.read();
    const query = input.query.trim().toLowerCase();

    const annotations = Object.values(store.annotationsById).filter((annotation) => {
      if (input.pageUrl && normalizeUrl(annotation.pageUrl) !== normalizeUrl(input.pageUrl)) {
        return false;
      }
      if (input.status && annotation.status !== input.status) {
        return false;
      }
      if (input.severity && annotation.severity !== input.severity) {
        return false;
      }
      if (input.intent && annotation.intent !== input.intent) {
        return false;
      }

      const haystack = [
        annotation.comment,
        annotation.selector,
        annotation.elementPath,
        annotation.textContent ?? '',
        annotation.selectedText ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });

    return annotations
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, input.limit ?? 100);
  }

  async updateAnnotationMetadata(input: UpdateAnnotationInput): Promise<Annotation> {
    return withStore(this.storePath, async (store) => {
      const { store: next, updated } = updateAnnotationMetadata(
        store,
        input.id,
        input.patch,
        input.expectedUpdatedAt
      );
      return {
        store: next,
        result: updated,
      };
    });
  }

  async bulkUpdateAnnotationMetadata(input: BulkUpdateInput): Promise<Annotation[]> {
    return withStore(this.storePath, async (store) => {
      let current = store;
      const updates: Annotation[] = [];
      for (const id of input.ids) {
        const result = updateAnnotationMetadata(current, id, input.patch);
        current = result.store;
        updates.push(result.updated);
      }

      return {
        store: current,
        result: updates,
      };
    });
  }

  async getChangesSince(since = 0, limit = 200): Promise<{ changes: ReturnType<typeof getChangesSince>; latest: number }> {
    const store = await this.read();
    const changes = getChangesSince(store, since, limit);
    const latest = changes.length > 0 ? changes[changes.length - 1]!.updatedAt : since;
    return { changes, latest };
  }
}
