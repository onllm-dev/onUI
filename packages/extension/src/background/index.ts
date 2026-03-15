/**
 * Background service worker entry point
 */

import { setupMessageHandler } from './messages';
import { bootstrapNativeSync } from './native-sync';
import { webext } from '@/shared/webext';
import { stateManager } from './state';

const LOG_PREFIX = '[onUI][background]';
const TOGGLE_ANNOTATE_COMMAND = 'toggle-annotate-mode';
const TOGGLE_DRAW_COMMAND = 'toggle-draw-mode';

console.log('[onUI] Background service worker initialized');

async function handleToggleAnnotateCommand(): Promise<void> {
  try {
    const tabs = await webext.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab?.id) {
      return;
    }

    const current = stateManager.getTabRuntimeState(activeTab.id);
    if (!current.enabled) {
      return;
    }

    const next = stateManager.setAnnotateMode(activeTab.id, !current.annotateMode);

    const payload = {
      type: 'TAB_RUNTIME_STATE_CHANGED' as const,
      payload: {
        tabId: activeTab.id,
        state: next,
      },
      meta: {
        source: 'background' as const,
        sentAt: Date.now(),
      },
    };

    try {
      await webext.tabs.sendMessage(activeTab.id, payload);
    } catch {
      // Content script may not be injected in this tab; ignore.
    }

    try {
      await webext.runtime.sendMessage(payload);
    } catch {
      // Popup or extension listeners may not be present; ignore.
    }

    console.log(`${LOG_PREFIX} command toggled annotate mode`, {
      tabId: activeTab.id,
      annotateMode: next.annotateMode,
    });
  } catch (error) {
    console.warn(`${LOG_PREFIX} failed to handle command`, {
      command: TOGGLE_ANNOTATE_COMMAND,
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
}

async function handleToggleDrawCommand(): Promise<void> {
  try {
    const tabs = await webext.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab?.id) {
      return;
    }

    const current = stateManager.getTabRuntimeState(activeTab.id);
    if (!current.enabled) {
      return;
    }

    const payload = {
      type: 'TOGGLE_DRAW_MODE' as const,
      meta: {
        source: 'background' as const,
        sentAt: Date.now(),
      },
    };

    try {
      await webext.tabs.sendMessage(activeTab.id, payload);
    } catch {
      // Content script may not be injected in this tab; ignore.
    }

    console.log(`${LOG_PREFIX} command toggled draw mode`, {
      tabId: activeTab.id,
    });
  } catch (error) {
    console.warn(`${LOG_PREFIX} failed to handle command`, {
      command: TOGGLE_DRAW_COMMAND,
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
}

// Set up message handling
setupMessageHandler();
void bootstrapNativeSync();

webext.commands.onCommand.addListener((command) => {
  if (command === TOGGLE_ANNOTATE_COMMAND) {
    void handleToggleAnnotateCommand();
  } else if (command === TOGGLE_DRAW_COMMAND) {
    void handleToggleDrawCommand();
  }
});

// Listen for extension install/update
webext.runtime.onInstalled.addListener((details) => {
  console.log('[onUI] Extension installed/updated:', details.reason);
});
