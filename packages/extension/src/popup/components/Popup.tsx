import { useState, useEffect } from 'preact/hooks';

function isSupportedTabUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export function Popup() {
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [tabEnabled, setTabEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupportedPage, setIsSupportedPage] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ok' | 'error' | 'unavailable'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load state from current tab
  useEffect(() => {
    const loadState = async () => {
      try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url) {
          setIsLoading(false);
          return;
        }
        setActiveTabId(tab.id);

        const supported = isSupportedTabUrl(tab.url);
        setIsSupportedPage(supported);

        // Get tab runtime state
        const stateResponse = await chrome.runtime.sendMessage({
          type: 'GET_TAB_RUNTIME_STATE',
          payload: { tabId: tab.id },
        });

        if (stateResponse?.success) {
          setTabEnabled(stateResponse.data?.enabled || false);
        }

        const syncResponse = await chrome.runtime.sendMessage({
          type: 'GET_SYNC_STATUS',
        });

        if (syncResponse?.success && syncResponse.data) {
          setSyncStatus(syncResponse.data.status ?? 'idle');
          setSyncError(syncResponse.data.lastError ?? null);
        }
      } catch (error) {
        console.error('[onUI Popup] Failed to load state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadState();
  }, []);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const syncResponse = await chrome.runtime.sendMessage({
          type: 'GET_SYNC_STATUS',
        });
        if (syncResponse?.success && syncResponse.data) {
          setSyncStatus(syncResponse.data.status ?? 'idle');
          setSyncError(syncResponse.data.lastError ?? null);
        }
      } catch {
        // Ignore while popup is open.
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // Keep popup state synced if background pushes runtime state updates
  useEffect(() => {
    if (!activeTabId) {
      return;
    }

    const handleRuntimeStateChanged = (
      message: {
        type?: string;
        payload?: {
          tabId?: number;
          state?: { enabled?: boolean; annotateMode?: boolean };
        };
      }
    ) => {
      if (message.type !== 'TAB_RUNTIME_STATE_CHANGED') {
        return;
      }

      if (message.payload?.tabId !== activeTabId) {
        return;
      }

      const nextState = message.payload.state;
      if (!nextState) {
        return;
      }

      setTabEnabled(Boolean(nextState.enabled));
    };

    chrome.runtime.onMessage.addListener(handleRuntimeStateChanged);
    return () => chrome.runtime.onMessage.removeListener(handleRuntimeStateChanged);
  }, [activeTabId]);

  const handleToggleTabEnabled = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      if (!isSupportedPage) return;

      const nextEnabled = !tabEnabled;
      setTabEnabled(nextEnabled);

      const response = await chrome.runtime.sendMessage({
        type: 'SET_TAB_ENABLED',
        payload: { tabId: tab.id, enabled: nextEnabled },
      });

      if (response?.success && response.data) {
        setTabEnabled(response.data.enabled);
      } else {
        setTabEnabled(!nextEnabled);
      }
    } catch (error) {
      console.error('[onUI Popup] Failed to toggle tab enabled:', error);
      setTabEnabled((prev) => !prev);
    }
  };

  if (isLoading) {
    return (
      <div class="popup">
        <div class="popup-header">
          <span class="popup-title">
            <span>onUI</span>
          </span>
        </div>
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--popup-text-secondary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div class="popup">
      <div class="popup-header">
        <span class="popup-title">
          <span>onUI</span>
        </span>
      </div>

      <div class="popup-section">
        <div class="popup-section-title">This Tab</div>
        <div
          class={`popup-toggle ${!isSupportedPage ? 'disabled' : ''}`}
          onClick={handleToggleTabEnabled}
        >
          <span class="popup-toggle-label">
            {tabEnabled ? 'onUI is On' : 'onUI is Off'}
          </span>
          <div class={`popup-toggle-switch ${tabEnabled ? 'active' : ''}`} />
        </div>
        {!isSupportedPage && (
          <div class="popup-helper-text">onUI cannot run on this page.</div>
        )}
        {isSupportedPage && !tabEnabled && (
          <div class="popup-helper-text">Turn on for this tab to annotate.</div>
        )}
      </div>

      <div class="popup-section">
        <div class="popup-section-title">MCP Sync</div>
        <div class={`popup-sync-status popup-sync-${syncStatus}`}>
          <span class="popup-sync-dot" />
          <span>Local bridge: {syncStatus}</span>
        </div>
        {syncError && (
          <div class="popup-helper-text">{syncError}</div>
        )}
      </div>

      <div class="popup-footer">
        <span>onUI v1.0.4 • </span>
        <a href="https://github.com/anthropics/onui" target="_blank" rel="noopener">
          GitHub
        </a>
      </div>
    </div>
  );
}
