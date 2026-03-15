import type {
  Message,
  TabRuntimeState,
  GetAnnotationsResponse,
  CreateAnnotationResponse,
  CreateAnnotationsBulkResponse,
  UpdateAnnotationResponse,
  DeleteAnnotationResponse,
  ClearAnnotationsResponse,
  GetSettingsResponse,
  UpdateSettingsResponse,
  GetTabRuntimeStateResponse,
  SetTabEnabledResponse,
  SetAnnotateModeResponse,
  CaptureViewportResponse,
  AnnotationInput,
  AnnotationUpdate,
  Settings,
} from '@/types';
import { webext } from '@/shared/webext';

const LOG_PREFIX = '[onUI][messaging]';
const REQUEST_TIMEOUT_MS = 15000;

function sanitizeUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'invalid-url';
  }
}

let requestCounter = 0;

function nextRequestId(): string {
  requestCounter += 1;
  return `msg-${Date.now()}-${requestCounter}`;
}

/**
 * Check if extension context is still valid
 */
export function isExtensionContextValid(): boolean {
  try {
    return typeof webext.runtime !== 'undefined' && typeof webext.runtime.id !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Custom error for invalidated extension context
 */
export class ExtensionContextInvalidatedError extends Error {
  constructor() {
    super('Extension has been updated. Please refresh the page.');
    this.name = 'ExtensionContextInvalidatedError';
  }
}

/**
 * Custom error for message timeout
 */
export class ExtensionMessageTimeoutError extends Error {
  constructor(messageType: Message['type'], timeoutMs: number) {
    super(`Message ${messageType} timed out after ${timeoutMs}ms`);
    this.name = 'ExtensionMessageTimeoutError';
  }
}

/**
 * Check if an error indicates the extension context is invalidated
 */
export function isContextInvalidatedError(error: unknown): boolean {
  if (error instanceof ExtensionContextInvalidatedError) {
    return true;
  }
  if (error instanceof Error) {
    return (
      error.message.includes('Extension context invalidated') ||
      error.message.includes('message channel closed') ||
      error.message.includes('Receiving end does not exist') ||
      error.message.includes('No response from background script')
    );
  }
  return false;
}

/**
 * Send a message to the background service worker
 * With validation and error handling
 */
async function sendMessage<T>(message: Message): Promise<T> {
  const requestId = nextRequestId();
  const startedAt = Date.now();

  // Check context before sending
  const contextValidBeforeSend = isExtensionContextValid();
  if (!contextValidBeforeSend) {
    console.error(`${LOG_PREFIX} ${requestId} blocked: invalid extension context before send`, {
      type: message.type,
      url: sanitizeUrlForLog(window.location.href),
    });
    throw new ExtensionContextInvalidatedError();
  }

  const enrichedMessage: Message = {
    ...message,
    meta: {
      ...(message.meta ?? {}),
      requestId,
      sentAt: startedAt,
      source: 'content',
    },
  };

  console.log(`${LOG_PREFIX} ${requestId} send`, {
    type: message.type,
    url: sanitizeUrlForLog(window.location.href),
  });

  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new ExtensionMessageTimeoutError(message.type, REQUEST_TIMEOUT_MS));
    }, REQUEST_TIMEOUT_MS);
  });

  try {
    const response = (await Promise.race([
      webext.runtime.sendMessage(enrichedMessage),
      timeoutPromise,
    ])) as T | undefined;

    const durationMs = Date.now() - startedAt;

    // Check if response is undefined (channel closed)
    if (response === undefined) {
      console.error(`${LOG_PREFIX} ${requestId} no response`, {
        type: message.type,
        durationMs,
      });
      throw new Error('No response from background script');
    }

    const responseRecord = response as Record<string, unknown>;
    console.log(`${LOG_PREFIX} ${requestId} response`, {
      type: message.type,
      durationMs,
      success: responseRecord.success,
      error: responseRecord.error,
      hasData: 'data' in responseRecord,
    });

    return response;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const invalidContext = isContextInvalidatedError(error);

    console.error(`${LOG_PREFIX} ${requestId} failed`, {
      type: message.type,
      durationMs,
      invalidContext,
      error: error instanceof Error ? error.message : error,
    });

    // Detect context invalidated error
    if (invalidContext) {
      throw new ExtensionContextInvalidatedError();
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

/**
 * Get annotations for the current page
 */
export async function getAnnotations(): Promise<GetAnnotationsResponse> {
  return sendMessage({
    type: 'GET_ANNOTATIONS',
    payload: { url: window.location.href },
  });
}

/**
 * Create a new annotation
 */
export async function createAnnotation(
  input: AnnotationInput
): Promise<CreateAnnotationResponse> {
  return sendMessage({
    type: 'CREATE_ANNOTATION',
    payload: input,
  });
}

/**
 * Create multiple annotations in one operation
 */
export async function createAnnotationsBulk(
  inputs: AnnotationInput[]
): Promise<CreateAnnotationsBulkResponse> {
  return sendMessage({
    type: 'CREATE_ANNOTATIONS_BULK',
    payload: { inputs },
  });
}

/**
 * Update an existing annotation
 */
export async function updateAnnotation(
  id: string,
  update: AnnotationUpdate
): Promise<UpdateAnnotationResponse> {
  return sendMessage({
    type: 'UPDATE_ANNOTATION',
    payload: { id, update },
  });
}

/**
 * Delete an annotation
 */
export async function deleteAnnotation(id: string): Promise<DeleteAnnotationResponse> {
  return sendMessage({
    type: 'DELETE_ANNOTATION',
    payload: { id },
  });
}

/**
 * Clear all annotations for the current page
 */
export async function clearAnnotations(): Promise<ClearAnnotationsResponse> {
  return sendMessage({
    type: 'CLEAR_ANNOTATIONS',
    payload: { url: window.location.href },
  });
}

/**
 * Get extension settings
 */
export async function getSettings(): Promise<GetSettingsResponse> {
  return sendMessage({
    type: 'GET_SETTINGS',
  });
}

/**
 * Update extension settings
 */
export async function updateSettings(
  update: Partial<Settings>
): Promise<UpdateSettingsResponse> {
  return sendMessage({
    type: 'UPDATE_SETTINGS',
    payload: update,
  });
}

/**
 * Get runtime state for current tab
 */
export async function getTabRuntimeState(): Promise<GetTabRuntimeStateResponse> {
  return sendMessage({
    type: 'GET_TAB_RUNTIME_STATE',
  });
}

/**
 * Set onUI enabled state for current tab
 */
export async function setTabEnabled(
  enabled: boolean
): Promise<SetTabEnabledResponse> {
  return sendMessage({
    type: 'SET_TAB_ENABLED',
    payload: { enabled },
  });
}

/**
 * Set annotate mode for current tab
 */
export async function setAnnotateMode(
  annotateMode: boolean
): Promise<SetAnnotateModeResponse> {
  return sendMessage({
    type: 'SET_ANNOTATE_MODE',
    payload: { annotateMode },
  });
}

/**
 * Capture visible viewport screenshot
 */
export async function captureViewport(): Promise<CaptureViewportResponse> {
  return sendMessage({
    type: 'CAPTURE_VIEWPORT',
  });
}

/**
 * Type guard for tab runtime state changed push messages
 */
export function isTabRuntimeStateChangedMessage(
  value: unknown
): value is { type: 'TAB_RUNTIME_STATE_CHANGED'; payload: { tabId: number; state: TabRuntimeState } } {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as { type?: unknown; payload?: unknown };
  if (maybe.type !== 'TAB_RUNTIME_STATE_CHANGED') return false;
  if (!maybe.payload || typeof maybe.payload !== 'object') return false;
  const payload = maybe.payload as { tabId?: unknown; state?: unknown };
  if (typeof payload.tabId !== 'number') return false;
  if (!payload.state || typeof payload.state !== 'object') return false;
  const state = payload.state as { enabled?: unknown; annotateMode?: unknown };
  return typeof state.enabled === 'boolean' && typeof state.annotateMode === 'boolean';
}

/**
 * Type guard for toggle draw mode push messages
 */
export function isToggleDrawModeMessage(value: unknown): value is { type: 'TOGGLE_DRAW_MODE' } {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as { type?: unknown };
  return maybe.type === 'TOGGLE_DRAW_MODE';
}
