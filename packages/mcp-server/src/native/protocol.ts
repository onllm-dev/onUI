import type { Annotation, AnnotationIntent, AnnotationSeverity, AnnotationStatus } from '@onui/core';
import type { ChangeRecord } from '../store/schema.js';

export type NativeRequestType =
  | 'PING'
  | 'UPSERT_PAGE_SNAPSHOT'
  | 'DELETE_PAGE'
  | 'GET_CHANGES_SINCE';

export interface NativeRequest {
  type: NativeRequestType;
  requestId: string;
  sentAt: number;
  payload: unknown;
}

export interface NativeResponse {
  ok: boolean;
  requestId: string;
  data?: unknown;
  error?: string | null;
}

export interface UpsertPageSnapshotPayload {
  pageUrl: string;
  pageTitle: string;
  annotations: Annotation[];
}

export interface DeletePagePayload {
  pageUrl: string;
}

export interface GetChangesSincePayload {
  since?: number;
  limit?: number;
}

export interface MetadataPatchPayload {
  id: string;
  status?: AnnotationStatus;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
  comment?: string;
  expectedUpdatedAt?: number;
}

export interface BulkMetadataPatchPayload {
  ids: string[];
  patch: {
    status?: AnnotationStatus;
    intent?: AnnotationIntent;
    severity?: AnnotationSeverity;
  };
}

export interface GetChangesSinceResult {
  changes: ChangeRecord[];
  latest: number;
}

export function isNativeRequest(value: unknown): value is NativeRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.type === 'string' &&
    typeof record.requestId === 'string' &&
    typeof record.sentAt === 'number' &&
    'payload' in record
  );
}

export function createResponse(
  requestId: string,
  ok: boolean,
  data?: unknown,
  error?: string | null
): NativeResponse {
  return {
    ok,
    requestId,
    data,
    error: error ?? null,
  };
}
