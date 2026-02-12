import type { Annotation, AnnotationIntent, AnnotationSeverity, AnnotationStatus } from '@onui/core';

export const STORE_VERSION = 1;

export interface PageRecord {
  url: string;
  title: string;
  annotationIds: string[];
  updatedAt: number;
}

export interface AnnotationRecord extends Annotation {
  pageUrl: string;
  pageTitle: string;
}

export interface MetadataPatch {
  status?: AnnotationStatus;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
  comment?: string;
}

export interface ChangeRecord {
  id: string;
  type: 'metadata_update';
  annotationId: string;
  patch: MetadataPatch;
  updatedAt: number;
}

export interface StoreSnapshot {
  version: number;
  updatedAt: number;
  pages: Record<string, PageRecord>;
  annotationsById: Record<string, AnnotationRecord>;
  changeLog: ChangeRecord[];
}

export interface UpsertPageSnapshotInput {
  pageUrl: string;
  pageTitle: string;
  annotations: Annotation[];
}

export function createEmptyStore(now = Date.now()): StoreSnapshot {
  return {
    version: STORE_VERSION,
    updatedAt: now,
    pages: {},
    annotationsById: {},
    changeLog: [],
  };
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`;
  } catch {
    return url;
  }
}

export function ensureStoreShape(candidate: unknown): StoreSnapshot {
  if (!candidate || typeof candidate !== 'object') {
    return createEmptyStore();
  }

  const value = candidate as Partial<StoreSnapshot>;
  if (value.version !== STORE_VERSION) {
    return createEmptyStore();
  }

  return {
    version: STORE_VERSION,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
    pages: value.pages && typeof value.pages === 'object' ? value.pages : {},
    annotationsById:
      value.annotationsById && typeof value.annotationsById === 'object'
        ? value.annotationsById
        : {},
    changeLog: Array.isArray(value.changeLog) ? value.changeLog : [],
  };
}

export function upsertPageSnapshot(
  store: StoreSnapshot,
  input: UpsertPageSnapshotInput,
  now = Date.now()
): StoreSnapshot {
  const normalizedUrl = normalizeUrl(input.pageUrl);
  const currentPage = store.pages[normalizedUrl];
  const previousAnnotationIds = new Set(currentPage?.annotationIds ?? []);
  const nextAnnotationIds: string[] = [];
  const annotationsById = { ...store.annotationsById };

  for (const annotation of input.annotations) {
    const id = annotation.id;
    nextAnnotationIds.push(id);
    previousAnnotationIds.delete(id);

    const existing = annotationsById[id];
    if (existing && existing.updatedAt > annotation.updatedAt) {
      continue;
    }

    annotationsById[id] = {
      ...annotation,
      pageUrl: normalizedUrl,
      pageTitle: input.pageTitle || annotation.pageTitle,
    };
  }

  for (const id of previousAnnotationIds) {
    delete annotationsById[id];
  }

  const pages = {
    ...store.pages,
    [normalizedUrl]: {
      url: normalizedUrl,
      title: input.pageTitle,
      annotationIds: nextAnnotationIds,
      updatedAt: now,
    },
  };

  if (nextAnnotationIds.length === 0) {
    delete pages[normalizedUrl];
  }

  return {
    ...store,
    updatedAt: now,
    pages,
    annotationsById,
  };
}

export function deletePageSnapshot(store: StoreSnapshot, pageUrl: string, now = Date.now()): StoreSnapshot {
  const normalizedUrl = normalizeUrl(pageUrl);
  const existingPage = store.pages[normalizedUrl];
  if (!existingPage) {
    return store;
  }

  const pages = { ...store.pages };
  const annotationsById = { ...store.annotationsById };

  for (const id of existingPage.annotationIds) {
    delete annotationsById[id];
  }

  delete pages[normalizedUrl];

  return {
    ...store,
    updatedAt: now,
    pages,
    annotationsById,
  };
}

export function updateAnnotationMetadata(
  store: StoreSnapshot,
  annotationId: string,
  patch: MetadataPatch,
  expectedUpdatedAt?: number,
  now = Date.now()
): { store: StoreSnapshot; updated: AnnotationRecord } {
  const annotation = store.annotationsById[annotationId];
  if (!annotation) {
    throw new Error(`Annotation not found: ${annotationId}`);
  }

  if (expectedUpdatedAt !== undefined && annotation.updatedAt !== expectedUpdatedAt) {
    throw new Error(`Update conflict for annotation ${annotationId}`);
  }

  const updated: AnnotationRecord = {
    ...annotation,
    ...patch,
    updatedAt: now,
  };

  const change: ChangeRecord = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'metadata_update',
    annotationId,
    patch,
    updatedAt: now,
  };

  const annotationsById = {
    ...store.annotationsById,
    [annotationId]: updated,
  };

  const pages = {
    ...store.pages,
    [updated.pageUrl]: {
      ...store.pages[updated.pageUrl],
      updatedAt: now,
      url: updated.pageUrl,
      title: updated.pageTitle,
      annotationIds: store.pages[updated.pageUrl]?.annotationIds ?? [annotationId],
    },
  };

  return {
    updated,
    store: {
      ...store,
      updatedAt: now,
      pages,
      annotationsById,
      changeLog: [...store.changeLog, change].slice(-5000),
    },
  };
}

export function getChangesSince(
  store: StoreSnapshot,
  since = 0,
  limit = 200
): ChangeRecord[] {
  return store.changeLog.filter((change) => change.updatedAt > since).slice(0, limit);
}
