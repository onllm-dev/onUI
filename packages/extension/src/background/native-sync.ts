import type { Annotation } from '@/types';
import { storageService } from './storage';

const LOG_PREFIX = '[onUI][background][native-sync]';
const NATIVE_HOST_NAME = 'com.onui.native';
const CURSOR_STORAGE_KEY = 'onui_native_sync_cursor';
const SYNC_ALARM_NAME = 'onui_native_pull';
const SYNC_INTERVAL_MINUTES = 1;

interface NativeRequest {
  type: 'PING' | 'UPSERT_PAGE_SNAPSHOT' | 'DELETE_PAGE' | 'GET_CHANGES_SINCE';
  requestId: string;
  sentAt: number;
  payload: unknown;
}

interface NativeResponse<T = unknown> {
  ok: boolean;
  requestId: string;
  data?: T;
  error?: string | null;
}

interface ChangeRecord {
  id: string;
  type: 'metadata_update';
  annotationId: string;
  patch: {
    status?: Annotation['status'];
    intent?: Annotation['intent'];
    severity?: Annotation['severity'];
    comment?: string;
  };
  updatedAt: number;
}

interface GetChangesResult {
  changes: ChangeRecord[];
  latest: number;
}

interface SyncStatus {
  status: 'idle' | 'ok' | 'error' | 'unavailable';
  lastSyncAt?: number;
  lastPullAt?: number;
  lastError?: string;
  cursor: number;
}

const syncStatus: SyncStatus = {
  status: 'idle',
  cursor: 0,
};

let alarmListenerRegistered = false;

function nextRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function setSyncStatus(update: Partial<SyncStatus>): void {
  Object.assign(syncStatus, update);
}

function isHostUnavailableError(errorMessage: string): boolean {
  return (
    errorMessage.includes('Specified native messaging host not found') ||
    errorMessage.includes('No such native application') ||
    errorMessage.includes('Access to native messaging host denied')
  );
}

async function sendNativeRequest<T = unknown>(request: NativeRequest): Promise<T> {
  const response = (await chrome.runtime.sendNativeMessage(
    NATIVE_HOST_NAME,
    request
  )) as NativeResponse<T>;

  if (!response?.ok) {
    throw new Error(response?.error || 'Native host request failed');
  }

  return response.data as T;
}

async function getCursor(): Promise<number> {
  const result = await chrome.storage.local.get(CURSOR_STORAGE_KEY);
  const cursor = result[CURSOR_STORAGE_KEY];
  return typeof cursor === 'number' ? cursor : 0;
}

async function setCursor(cursor: number): Promise<void> {
  await chrome.storage.local.set({ [CURSOR_STORAGE_KEY]: cursor });
  syncStatus.cursor = cursor;
}

async function applyMetadataChange(change: ChangeRecord): Promise<void> {
  if (change.type !== 'metadata_update') {
    return;
  }

  const pageUrl = await storageService.getAnnotationUrlById(change.annotationId);
  if (!pageUrl) {
    return;
  }

  const annotations = await storageService.getAnnotations(pageUrl);
  const index = annotations.findIndex((annotation) => annotation.id === change.annotationId);
  if (index === -1) {
    return;
  }

  const existing = annotations[index];
  if (!existing || existing.updatedAt > change.updatedAt) {
    return;
  }

  annotations[index] = {
    ...existing,
    ...(change.patch.status !== undefined ? { status: change.patch.status } : {}),
    ...(change.patch.intent !== undefined ? { intent: change.patch.intent } : {}),
    ...(change.patch.severity !== undefined ? { severity: change.patch.severity } : {}),
    ...(change.patch.comment !== undefined ? { comment: change.patch.comment } : {}),
    updatedAt: change.updatedAt,
  };

  await storageService.setAnnotations(pageUrl, annotations);
}

export async function syncPageSnapshotWithNativeHost(
  pageUrl: string,
  annotations: Annotation[]
): Promise<void> {
  try {
    await sendNativeRequest({
      type: 'UPSERT_PAGE_SNAPSHOT',
      requestId: nextRequestId('upsert'),
      sentAt: Date.now(),
      payload: {
        pageUrl,
        pageTitle: annotations[0]?.pageTitle ?? '',
        annotations,
      },
    });

    setSyncStatus({
      status: 'ok',
      lastSyncAt: Date.now(),
      lastError: undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown native sync error';
    setSyncStatus({
      status: isHostUnavailableError(errorMessage) ? 'unavailable' : 'error',
      lastError: errorMessage,
    });
    console.warn(`${LOG_PREFIX} syncPageSnapshot failed`, { pageUrl, errorMessage });
  }
}

export async function deletePageSnapshotFromNativeHost(pageUrl: string): Promise<void> {
  try {
    await sendNativeRequest({
      type: 'DELETE_PAGE',
      requestId: nextRequestId('delete'),
      sentAt: Date.now(),
      payload: { pageUrl },
    });

    setSyncStatus({
      status: 'ok',
      lastSyncAt: Date.now(),
      lastError: undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown native delete sync error';
    setSyncStatus({
      status: isHostUnavailableError(errorMessage) ? 'unavailable' : 'error',
      lastError: errorMessage,
    });
    console.warn(`${LOG_PREFIX} deletePageSnapshot failed`, { pageUrl, errorMessage });
  }
}

export async function resyncAllPagesToNativeHost(): Promise<void> {
  const all = await storageService.getAllAnnotations();
  const entries = Object.entries(all);

  for (const [url, annotations] of entries) {
    if (annotations.length === 0) {
      await deletePageSnapshotFromNativeHost(url);
      continue;
    }

    await syncPageSnapshotWithNativeHost(url, annotations);
  }
}

export async function pullChangesFromNativeHost(): Promise<void> {
  const since = await getCursor();

  try {
    const result = await sendNativeRequest<GetChangesResult>({
      type: 'GET_CHANGES_SINCE',
      requestId: nextRequestId('pull'),
      sentAt: Date.now(),
      payload: {
        since,
        limit: 200,
      },
    });

    for (const change of result.changes) {
      await applyMetadataChange(change);
    }

    if (typeof result.latest === 'number' && result.latest > since) {
      await setCursor(result.latest);
    }

    setSyncStatus({
      status: 'ok',
      lastPullAt: Date.now(),
      lastError: undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown native pull error';
    setSyncStatus({
      status: isHostUnavailableError(errorMessage) ? 'unavailable' : 'error',
      lastError: errorMessage,
    });
    console.warn(`${LOG_PREFIX} pullChanges failed`, { errorMessage });
  }
}

export function getNativeSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

async function ensureAlarmPolling(): Promise<void> {
  if (!alarmListenerRegistered) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name !== SYNC_ALARM_NAME) {
        return;
      }
      void pullChangesFromNativeHost();
    });
    alarmListenerRegistered = true;
  }

  await chrome.alarms.create(SYNC_ALARM_NAME, {
    periodInMinutes: SYNC_INTERVAL_MINUTES,
  });
}

export async function bootstrapNativeSync(): Promise<void> {
  await ensureAlarmPolling();

  try {
    const cursor = await getCursor();
    setSyncStatus({ cursor });

    await sendNativeRequest({
      type: 'PING',
      requestId: nextRequestId('ping'),
      sentAt: Date.now(),
      payload: {},
    });

    setSyncStatus({ status: 'ok', lastError: undefined });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown native bootstrap error';
    setSyncStatus({
      status: isHostUnavailableError(errorMessage) ? 'unavailable' : 'error',
      lastError: errorMessage,
    });
    console.warn(`${LOG_PREFIX} bootstrap failed`, { errorMessage });
    return;
  }

  await resyncAllPagesToNativeHost();
  await pullChangesFromNativeHost();
}
