import { useState, useEffect } from 'preact/hooks';
import { copyToClipboard } from '@/content/utils/clipboard';
import { webext } from '@/shared/webext';

const MCP_SETUP_DOCS_URL = 'https://github.com/onllm-dev/onUI/blob/main/docs/mcp-setup.md';
const MCP_SETUP_COMMAND_UNIX = 'curl -fsSL https://github.com/onllm-dev/onUI/releases/latest/download/install.sh | bash -s -- --mcp';
const MCP_SETUP_COMMAND_WINDOWS = 'irm https://github.com/onllm-dev/onUI/releases/latest/download/install.ps1 | iex';
const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/tushar_s';

function isSupportedTabUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function isLikelyWindowsPlatform(): boolean {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  return /Windows/i.test(ua) || /Win/i.test(platform);
}

function getSetupCommand(): string {
  return isLikelyWindowsPlatform() ? MCP_SETUP_COMMAND_WINDOWS : MCP_SETUP_COMMAND_UNIX;
}

export function Popup() {
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [tabEnabled, setTabEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupportedPage, setIsSupportedPage] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ok' | 'error' | 'unavailable'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [setupCommandCopied, setSetupCommandCopied] = useState(false);

  // Load state from current tab
  useEffect(() => {
    const loadState = async () => {
      try {
        // Get current tab
        const [tab] = await webext.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url) {
          setIsLoading(false);
          return;
        }
        setActiveTabId(tab.id);

        const supported = isSupportedTabUrl(tab.url);
        setIsSupportedPage(supported);

        // Get tab runtime state
        const stateResponse = await webext.runtime.sendMessage({
          type: 'GET_TAB_RUNTIME_STATE',
          payload: { tabId: tab.id },
        });

        if (stateResponse?.success) {
          setTabEnabled(stateResponse.data?.enabled || false);
        }

        const syncResponse = await webext.runtime.sendMessage({
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
        const syncResponse = await webext.runtime.sendMessage({
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

    webext.runtime.onMessage.addListener(handleRuntimeStateChanged);
    return () => webext.runtime.onMessage.removeListener(handleRuntimeStateChanged);
  }, [activeTabId]);

  const handleToggleTabEnabled = async () => {
    try {
      const [tab] = await webext.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      if (!isSupportedPage) return;

      const nextEnabled = !tabEnabled;
      setTabEnabled(nextEnabled);

      const response = await webext.runtime.sendMessage({
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

  const handleCopyMcpSetupCommand = async () => {
    const copied = await copyToClipboard(getSetupCommand());
    if (!copied) {
      return;
    }

    setSetupCommandCopied(true);
    window.setTimeout(() => setSetupCommandCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div class="popup">
        <div class="popup-header">
          <span class="popup-title">
            <span>
              on<span class="popup-title-accent">UI</span>
            </span>
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
          <span>
            on<span class="popup-title-accent">UI</span>
          </span>
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

        {(syncStatus === 'unavailable' || syncStatus === 'error') && (
          <div class="popup-mcp-setup">
            <div class="popup-helper-text">
              Install local MCP to enable sync in compatible MCP clients.
            </div>
            <button class="popup-btn" onClick={handleCopyMcpSetupCommand}>
              {setupCommandCopied ? 'Copied setup command' : 'Copy MCP setup command'}
            </button>
            <a class="popup-link" href={MCP_SETUP_DOCS_URL} target="_blank" rel="noopener noreferrer">
              Open MCP setup guide
            </a>
          </div>
        )}
      </div>

      <div class="popup-footer">
        <span>onUI v2.1.1</span>
        <span aria-hidden="true">•</span>
        <a href="https://github.com/onllm-dev/onUI" target="_blank" rel="noopener">
          GitHub
        </a>
        <span aria-hidden="true">•</span>
        <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener">
          Buy Me a Coffee
        </a>
      </div>
    </div>
  );
}
