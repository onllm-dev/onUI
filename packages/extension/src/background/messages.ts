import type { Message, MessageResponse } from '@/types';
import { annotationManager } from './annotations';
import { storageService } from './storage';
import { stateManager } from './state';

const LOG_PREFIX = '[onUI][background][messages]';

async function notifyTabRuntimeStateChanged(tabId: number): Promise<void> {
  const state = stateManager.getTabRuntimeState(tabId);
  const payload = {
    type: 'TAB_RUNTIME_STATE_CHANGED' as const,
    payload: { tabId, state },
    meta: { source: 'background' as const, sentAt: Date.now() },
  };

  try {
    await chrome.tabs.sendMessage(tabId, payload);
  } catch {
    // Content script may not be available for this tab URL; ignore.
  }

  try {
    await chrome.runtime.sendMessage(payload);
  } catch {
    // Popup/extension page listeners may not exist; ignore.
  }
}

function sanitizeUrlForLog(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return undefined;
  }
}

/**
 * Handle incoming messages from content scripts and popup
 * Uses async IIFE pattern to ensure sendResponse is always called
 * even if the service worker becomes inactive (Manifest V3 limitation)
 */
export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: Message,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      const requestId = message.meta?.requestId ?? `bg-${Date.now()}`;
      const receivedAt = Date.now();

      console.log(`${LOG_PREFIX} ${requestId} received`, {
        type: message.type,
        senderTabId: sender.tab?.id,
        senderUrl: sanitizeUrlForLog(sender.tab?.url),
        source: message.meta?.source,
      });

      // Wrap in async IIFE to ensure sendResponse is called
      (async () => {
        try {
          const response = await handleMessage(message, sender, requestId, receivedAt);

          console.log(`${LOG_PREFIX} ${requestId} responding`, {
            type: message.type,
            durationMs: Date.now() - receivedAt,
            success: response.success,
            error: response.error,
          });

          sendResponse(response);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          console.error(`${LOG_PREFIX} ${requestId} handler failed`, {
            type: message.type,
            durationMs: Date.now() - receivedAt,
            error: errorMessage,
          });

          sendResponse({
            success: false,
            error: errorMessage,
          });
        }
      })();

      // Return true to indicate async response
      return true;
    }
  );
}

/**
 * Route messages to appropriate handlers
 * Note: For GET_STATE and SET_STATE, tabId is extracted from sender.tab.id
 * since content scripts cannot access chrome.tabs API
 */
async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
  requestId: string,
  receivedAt: number
): Promise<MessageResponse> {
  switch (message.type) {
    case 'GET_ANNOTATIONS': {
      const annotations = await annotationManager.getAnnotations(message.payload.url);
      console.log(`${LOG_PREFIX} ${requestId} GET_ANNOTATIONS completed`, {
        durationMs: Date.now() - receivedAt,
        count: annotations.length,
      });
      return { success: true, data: annotations };
    }

    case 'CREATE_ANNOTATION': {
      const annotation = await annotationManager.createAnnotation(message.payload);
      console.log(`${LOG_PREFIX} ${requestId} CREATE_ANNOTATION completed`, {
        durationMs: Date.now() - receivedAt,
        annotationId: annotation.id,
      });
      return { success: true, data: annotation };
    }

    case 'UPDATE_ANNOTATION': {
      const updated = await annotationManager.updateAnnotation(
        message.payload.id,
        message.payload.update,
        requestId
      );
      if (!updated) {
        return { success: false, error: 'Annotation not found' };
      }
      console.log(`${LOG_PREFIX} ${requestId} UPDATE_ANNOTATION completed`, {
        durationMs: Date.now() - receivedAt,
        annotationId: updated.id,
      });
      return { success: true, data: updated };
    }

    case 'DELETE_ANNOTATION': {
      const deleted = await annotationManager.deleteAnnotation(message.payload.id, requestId);
      if (!deleted) {
        return { success: false, error: 'Annotation not found' };
      }
      console.log(`${LOG_PREFIX} ${requestId} DELETE_ANNOTATION completed`, {
        durationMs: Date.now() - receivedAt,
      });
      return { success: true };
    }

    case 'CLEAR_ANNOTATIONS': {
      await annotationManager.clearAnnotations(message.payload.url, requestId);
      console.log(`${LOG_PREFIX} ${requestId} CLEAR_ANNOTATIONS completed`, {
        durationMs: Date.now() - receivedAt,
        url: sanitizeUrlForLog(message.payload.url),
      });
      return { success: true };
    }

    case 'GET_SETTINGS': {
      const settings = await storageService.getSettings();
      console.log(`${LOG_PREFIX} ${requestId} GET_SETTINGS completed`, {
        durationMs: Date.now() - receivedAt,
      });
      return { success: true, data: settings };
    }

    case 'UPDATE_SETTINGS': {
      const settings = await storageService.updateSettings(message.payload);
      console.log(`${LOG_PREFIX} ${requestId} UPDATE_SETTINGS completed`, {
        durationMs: Date.now() - receivedAt,
      });
      return { success: true, data: settings };
    }

    case 'GET_TAB_RUNTIME_STATE': {
      const tabId = message.payload?.tabId ?? sender.tab?.id;
      if (!tabId) {
        console.warn(`${LOG_PREFIX} ${requestId} GET_TAB_RUNTIME_STATE no tabId, returning default`);
        return {
          success: true,
          data: { enabled: false, annotateMode: false },
        };
      }

      const state = stateManager.getTabRuntimeState(tabId);
      console.log(`${LOG_PREFIX} ${requestId} GET_TAB_RUNTIME_STATE completed`, {
        durationMs: Date.now() - receivedAt,
        tabId,
        state,
      });
      return { success: true, data: state };
    }

    case 'SET_TAB_ENABLED': {
      const tabId = message.payload?.tabId ?? sender.tab?.id;
      if (!tabId) {
        console.warn(`${LOG_PREFIX} ${requestId} SET_TAB_ENABLED no tabId`);
        return { success: false, error: 'Missing tabId for SET_TAB_ENABLED' };
      }

      const state = stateManager.setTabEnabled(tabId, message.payload.enabled);
      await notifyTabRuntimeStateChanged(tabId);

      console.log(`${LOG_PREFIX} ${requestId} SET_TAB_ENABLED completed`, {
        durationMs: Date.now() - receivedAt,
        tabId,
        state,
      });
      return { success: true, data: state };
    }

    case 'SET_ANNOTATE_MODE': {
      const tabId = message.payload?.tabId ?? sender.tab?.id;
      if (!tabId) {
        console.warn(`${LOG_PREFIX} ${requestId} SET_ANNOTATE_MODE no tabId`);
        return { success: false, error: 'Missing tabId for SET_ANNOTATE_MODE' };
      }

      const state = stateManager.setAnnotateMode(tabId, message.payload.annotateMode);
      await notifyTabRuntimeStateChanged(tabId);

      console.log(`${LOG_PREFIX} ${requestId} SET_ANNOTATE_MODE completed`, {
        durationMs: Date.now() - receivedAt,
        tabId,
        state,
      });
      return { success: true, data: state };
    }

    case 'GET_STATE': {
      // Extract tabId from sender (content scripts can't access chrome.tabs)
      const tabId = message.payload?.tabId ?? sender.tab?.id;
      // Return safe default if no tabId (don't fail)
      if (!tabId) {
        console.warn(`${LOG_PREFIX} ${requestId} GET_STATE no tabId, returning default`);
        return { success: true, data: { isActive: false } };
      }
      const isActive = stateManager.getState(tabId);
      console.log(`${LOG_PREFIX} ${requestId} GET_STATE completed`, {
        durationMs: Date.now() - receivedAt,
        tabId,
        isActive,
      });
      return { success: true, data: { isActive } };
    }

    case 'SET_STATE': {
      // Extract tabId from sender (content scripts can't access chrome.tabs)
      const tabId = message.payload?.tabId ?? sender.tab?.id;
      // Return failure if no tabId so caller can handle rollback
      if (!tabId) {
        console.warn(`${LOG_PREFIX} ${requestId} SET_STATE no tabId`);
        return { success: false, error: 'Missing tabId for SET_STATE' };
      }
      const state = stateManager.setAnnotateMode(tabId, message.payload.isActive);
      await notifyTabRuntimeStateChanged(tabId);
      console.log(`${LOG_PREFIX} ${requestId} SET_STATE completed`, {
        durationMs: Date.now() - receivedAt,
        tabId,
        isActive: state.annotateMode,
      });
      return { success: true };
    }

    case 'TAB_RUNTIME_STATE_CHANGED': {
      // Event-style message broadcast by background; no-op if received back here.
      return { success: true };
    }

    default:
      return {
        success: false,
        error: `Unknown message type: ${(message as Message).type}`,
      };
  }
}
