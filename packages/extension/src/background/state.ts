/**
 * Per-tab state manager
 * Tracks tab runtime state (enabled + annotate mode) for each tab
 */
const TAB_RUNTIME_STATES_STORAGE_KEY = 'onui_tab_runtime_states';
const LOG_PREFIX = '[onUI][background][state]';

type TabRuntimeState = { enabled: boolean; annotateMode: boolean };

export class StateManager {
  private tabStates: Map<number, TabRuntimeState> = new Map();
  private hydrationPromise: Promise<void> | null = null;
  private persistQueue: Promise<void> = Promise.resolve();

  constructor() {
    // Clean up state when tabs are closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      void this.clearTabState(tabId);
    });
  }

  private getDefaultState(): TabRuntimeState {
    return { enabled: false, annotateMode: false };
  }

  private getStorageArea(): chrome.storage.StorageArea | null {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return null;
    }

    const storageWithSession = chrome.storage as typeof chrome.storage & {
      session?: chrome.storage.StorageArea;
    };

    return storageWithSession.session ?? null;
  }

  private parseTabRuntimeState(value: unknown): TabRuntimeState | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    if (typeof candidate.enabled !== 'boolean' || typeof candidate.annotateMode !== 'boolean') {
      return null;
    }

    return {
      enabled: candidate.enabled,
      annotateMode: candidate.annotateMode,
    };
  }

  private async ensureHydrated(): Promise<void> {
    if (this.hydrationPromise) {
      return this.hydrationPromise;
    }

    this.hydrationPromise = (async () => {
      const storageArea = this.getStorageArea();
      if (!storageArea) {
        return;
      }

      try {
        const result = await storageArea.get(TAB_RUNTIME_STATES_STORAGE_KEY);
        const rawStates = result[TAB_RUNTIME_STATES_STORAGE_KEY];
        if (!rawStates || typeof rawStates !== 'object') {
          return;
        }

        for (const [tabIdString, rawState] of Object.entries(rawStates as Record<string, unknown>)) {
          const tabId = Number(tabIdString);
          if (!Number.isFinite(tabId)) {
            continue;
          }

          const parsedState = this.parseTabRuntimeState(rawState);
          if (!parsedState) {
            continue;
          }

          this.tabStates.set(tabId, parsedState);
        }
      } catch (error) {
        console.warn(`${LOG_PREFIX} Failed to hydrate runtime state from session storage`, {
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    })();

    return this.hydrationPromise;
  }

  private persistStates(): Promise<void> {
    this.persistQueue = this.persistQueue
      .catch(() => {
        // Keep the queue healthy even if a previous write failed.
      })
      .then(async () => {
        const storageArea = this.getStorageArea();
        if (!storageArea) {
          return;
        }

        const serialized = Array.from(this.tabStates.entries()).reduce<Record<string, TabRuntimeState>>(
          (acc, [tabId, state]) => {
            acc[String(tabId)] = state;
            return acc;
          },
          {}
        );

        try {
          await storageArea.set({ [TAB_RUNTIME_STATES_STORAGE_KEY]: serialized });
        } catch (error) {
          console.warn(`${LOG_PREFIX} Failed to persist runtime state to session storage`, {
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      });

    return this.persistQueue;
  }

  private async clearTabState(tabId: number): Promise<void> {
    await this.ensureHydrated();
    this.tabStates.delete(tabId);
    await this.persistStates();
  }

  /**
   * Get runtime state for a tab
   */
  async getTabRuntimeState(tabId: number): Promise<TabRuntimeState> {
    await this.ensureHydrated();
    return this.tabStates.get(tabId) ?? this.getDefaultState();
  }

  /**
   * Set onUI enabled/disabled state for a tab.
   * Disabling always clears annotate mode.
   */
  async setTabEnabled(tabId: number, enabled: boolean): Promise<TabRuntimeState> {
    const current = await this.getTabRuntimeState(tabId);
    const next = {
      enabled,
      annotateMode: enabled ? current.annotateMode : false,
    };
    this.tabStates.set(tabId, next);
    await this.persistStates();
    return next;
  }

  /**
   * Set annotate mode for a tab.
   * Guard: annotate mode cannot be true when tab is disabled.
   */
  async setAnnotateMode(tabId: number, annotateMode: boolean): Promise<TabRuntimeState> {
    const current = await this.getTabRuntimeState(tabId);
    const next = {
      enabled: current.enabled,
      annotateMode: current.enabled ? annotateMode : false,
    };
    this.tabStates.set(tabId, next);
    await this.persistStates();
    return next;
  }

  /**
   * Compatibility getter for legacy active state API.
   * Maps directly to annotate mode.
   */
  async getState(tabId: number): Promise<boolean> {
    const state = await this.getTabRuntimeState(tabId);
    return state.annotateMode;
  }

  /**
   * Compatibility setter for legacy active state API.
   * Delegates to annotate mode setter.
   */
  async setState(tabId: number, isActive: boolean): Promise<void> {
    await this.setAnnotateMode(tabId, isActive);
  }

  /**
   * Compatibility toggle for legacy active state API.
   */
  async toggleState(tabId: number): Promise<boolean> {
    const current = await this.getState(tabId);
    const next = await this.setAnnotateMode(tabId, !current);
    return next.annotateMode;
  }
}

// Singleton instance
export const stateManager = new StateManager();
