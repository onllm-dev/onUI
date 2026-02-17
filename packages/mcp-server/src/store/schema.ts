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
  status?: AnnotationStatus | undefined;
  intent?: AnnotationIntent | undefined;
  severity?: AnnotationSeverity | undefined;
  comment?: string | undefined;
}

interface ChangeRecordBase {
  id: string;
  updatedAt: number;
}

export interface MetadataUpdateChangeRecord extends ChangeRecordBase {
  type: 'metadata_update';
  annotationId: string;
  patch: MetadataPatch;
}

export interface AnnotationDeleteChangeRecord extends ChangeRecordBase {
  type: 'annotation_delete';
  annotationId: string;
  pageUrl: string;
}

export interface PageClearChangeRecord extends ChangeRecordBase {
  type: 'page_clear';
  pageUrl: string;
  annotationIds: string[];
}

export type ChangeRecord =
  | MetadataUpdateChangeRecord
  | AnnotationDeleteChangeRecord
  | PageClearChangeRecord;

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

export function deleteAnnotation(
  store: StoreSnapshot,
  annotationId: string,
  now = Date.now()
): {
  store: StoreSnapshot;
  removed: AnnotationRecord;
  remainingOnPage: number;
} {
  const removed = store.annotationsById[annotationId];
  if (!removed) {
    throw new Error(`Annotation not found: ${annotationId}`);
  }

  const normalizedUrl = normalizeUrl(removed.pageUrl);
  const currentPage = store.pages[normalizedUrl];

  const annotationsById = { ...store.annotationsById };
  delete annotationsById[annotationId];

  const pages = { ...store.pages };
  let remainingOnPage = 0;

  if (currentPage) {
    const nextAnnotationIds = currentPage.annotationIds.filter((id) => id !== annotationId);
    remainingOnPage = nextAnnotationIds.length;

    if (nextAnnotationIds.length > 0) {
      pages[normalizedUrl] = {
        ...currentPage,
        annotationIds: nextAnnotationIds,
        updatedAt: now,
      };
    } else {
      delete pages[normalizedUrl];
    }
  }

  const change: AnnotationDeleteChangeRecord = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'annotation_delete',
    annotationId,
    pageUrl: normalizedUrl,
    updatedAt: now,
  };

  return {
    removed,
    remainingOnPage,
    store: {
      ...store,
      updatedAt: now,
      pages,
      annotationsById,
      changeLog: [...store.changeLog, change].slice(-5000),
    },
  };
}

export function clearPageAnnotations(
  store: StoreSnapshot,
  pageUrl: string,
  now = Date.now()
): {
  store: StoreSnapshot;
  removedCount: number;
} {
  const normalizedUrl = normalizeUrl(pageUrl);
  const existingPage = store.pages[normalizedUrl];
  if (!existingPage) {
    return {
      store,
      removedCount: 0,
    };
  }

  const annotationIds = [...existingPage.annotationIds];
  const annotationsById = { ...store.annotationsById };
  for (const id of annotationIds) {
    delete annotationsById[id];
  }

  const pages = { ...store.pages };
  delete pages[normalizedUrl];

  const change: PageClearChangeRecord = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'page_clear',
    pageUrl: normalizedUrl,
    annotationIds,
    updatedAt: now,
  };

  return {
    removedCount: annotationIds.length,
    store: {
      ...store,
      updatedAt: now,
      pages,
      annotationsById,
      changeLog: [...store.changeLog, change].slice(-5000),
    },
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
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.intent !== undefined ? { intent: patch.intent } : {}),
    ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
    ...(patch.comment !== undefined ? { comment: patch.comment } : {}),
    updatedAt: now,
  };

  const change: MetadataUpdateChangeRecord = {
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
