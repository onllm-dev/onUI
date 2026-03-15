import { beforeEach, describe, expect, it, vi } from 'vitest';

const tabsQuery = vi.fn();
const tabsSendMessage = vi.fn();
const runtimeSendMessage = vi.fn();
const onCommandAddListener = vi.fn();
const onInstalledAddListener = vi.fn();
const onMessageAddListener = vi.fn();
const onUpdatedAddListener = vi.fn();
const onRemovedAddListener = vi.fn();

const setAnnotateModeMock = vi.fn();
const getTabRuntimeStateMock = vi.fn();

vi.mock('@/shared/webext', () => ({
  webext: {
    tabs: {
      query: tabsQuery,
      sendMessage: tabsSendMessage,
      onUpdated: { addListener: onUpdatedAddListener },
      onRemoved: { addListener: onRemovedAddListener },
    },
    runtime: {
      onInstalled: { addListener: onInstalledAddListener },
      onMessage: { addListener: onMessageAddListener },
      sendMessage: runtimeSendMessage,
    },
    commands: {
      onCommand: { addListener: onCommandAddListener },
    },
  },
}));

vi.mock('./messages', () => ({
  setupMessageHandler: vi.fn(),
}));

vi.mock('./native-sync', () => ({
  bootstrapNativeSync: vi.fn(async () => {}),
}));

vi.mock('./state', () => ({
  stateManager: {
    getTabRuntimeState: getTabRuntimeStateMock,
    setAnnotateMode: setAnnotateModeMock,
  },
}));

describe('background command toggle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    tabsQuery.mockResolvedValue([]);
    tabsSendMessage.mockResolvedValue(undefined);
    runtimeSendMessage.mockResolvedValue(undefined);
    getTabRuntimeStateMock.mockReturnValue({ enabled: true, annotateMode: false });
    setAnnotateModeMock.mockReturnValue({ enabled: true, annotateMode: true });
  });

  async function loadBackgroundAndGetCommandHandler() {
    await import('./index');
    const handler = onCommandAddListener.mock.calls[0]?.[0];
    if (!handler) {
      throw new Error('Command listener was not registered');
    }
    return handler as (command: string) => void;
  }

  it('registers command listener on startup', async () => {
    await import('./index');
    expect(onCommandAddListener).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown commands', async () => {
    const handler = await loadBackgroundAndGetCommandHandler();

    handler('other-command');
    await Promise.resolve();

    expect(tabsQuery).not.toHaveBeenCalled();
    expect(setAnnotateModeMock).not.toHaveBeenCalled();
  });

  it('toggles annotate mode for enabled active tab', async () => {
    const handler = await loadBackgroundAndGetCommandHandler();
    tabsQuery.mockResolvedValue([{ id: 321 }]);
    getTabRuntimeStateMock.mockReturnValue({ enabled: true, annotateMode: false });
    setAnnotateModeMock.mockReturnValue({ enabled: true, annotateMode: true });

    handler('toggle-annotate-mode');
    await Promise.resolve();
    await Promise.resolve();

    expect(tabsQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(getTabRuntimeStateMock).toHaveBeenCalledWith(321);
    expect(setAnnotateModeMock).toHaveBeenCalledWith(321, true);
    expect(tabsSendMessage).toHaveBeenCalledWith(
      321,
      expect.objectContaining({
        type: 'TAB_RUNTIME_STATE_CHANGED',
        payload: {
          tabId: 321,
          state: { enabled: true, annotateMode: true },
        },
      })
    );
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TAB_RUNTIME_STATE_CHANGED',
        payload: {
          tabId: 321,
          state: { enabled: true, annotateMode: true },
        },
      })
    );
  });

  it('does nothing when active tab is not enabled', async () => {
    const handler = await loadBackgroundAndGetCommandHandler();
    tabsQuery.mockResolvedValue([{ id: 77 }]);
    getTabRuntimeStateMock.mockReturnValue({ enabled: false, annotateMode: false });

    handler('toggle-annotate-mode');
    await Promise.resolve();
    await Promise.resolve();

    expect(setAnnotateModeMock).not.toHaveBeenCalled();
    expect(tabsSendMessage).not.toHaveBeenCalled();
    expect(runtimeSendMessage).not.toHaveBeenCalled();
  });
});
