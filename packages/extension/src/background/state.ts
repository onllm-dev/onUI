/**
 * Per-tab state manager
 * Tracks tab runtime state (enabled + annotate mode) for each tab
 */
export class StateManager {
  private tabStates: Map<number, { enabled: boolean; annotateMode: boolean }> = new Map();

  constructor() {
    // Clean up state when tabs are closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabStates.delete(tabId);
    });
  }

  private getDefaultState(): { enabled: boolean; annotateMode: boolean } {
    return { enabled: false, annotateMode: false };
  }

  /**
   * Get runtime state for a tab
   */
  getTabRuntimeState(tabId: number): { enabled: boolean; annotateMode: boolean } {
    return this.tabStates.get(tabId) ?? this.getDefaultState();
  }

  /**
   * Set onUI enabled/disabled state for a tab.
   * Disabling always clears annotate mode.
   */
  setTabEnabled(tabId: number, enabled: boolean): { enabled: boolean; annotateMode: boolean } {
    const current = this.getTabRuntimeState(tabId);
    const next = {
      enabled,
      annotateMode: enabled ? current.annotateMode : false,
    };
    this.tabStates.set(tabId, next);
    return next;
  }

  /**
   * Set annotate mode for a tab.
   * Guard: annotate mode cannot be true when tab is disabled.
   */
  setAnnotateMode(tabId: number, annotateMode: boolean): { enabled: boolean; annotateMode: boolean } {
    const current = this.getTabRuntimeState(tabId);
    const next = {
      enabled: current.enabled,
      annotateMode: current.enabled ? annotateMode : false,
    };
    this.tabStates.set(tabId, next);
    return next;
  }

  /**
   * Compatibility getter for legacy active state API.
   * Maps directly to annotate mode.
   */
  getState(tabId: number): boolean {
    return this.getTabRuntimeState(tabId).annotateMode;
  }

  /**
   * Compatibility setter for legacy active state API.
   * Delegates to annotate mode setter.
   */
  setState(tabId: number, isActive: boolean): void {
    this.setAnnotateMode(tabId, isActive);
  }

  /**
   * Compatibility toggle for legacy active state API.
   */
  toggleState(tabId: number): boolean {
    const current = this.getState(tabId);
    const next = this.setAnnotateMode(tabId, !current);
    return next.annotateMode;
  }
}

// Singleton instance
export const stateManager = new StateManager();
