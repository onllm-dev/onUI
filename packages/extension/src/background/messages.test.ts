import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./annotations', () => ({
  annotationManager: {
    getAnnotations: vi.fn(),
    createAnnotation: vi.fn(),
    createAnnotationsBulk: vi.fn(),
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
    clearAnnotations: vi.fn(),
  },
}));

vi.mock('./native-sync', () => ({
  getNativeSyncStatus: vi.fn(() => ({ status: 'idle', cursor: 0 })),
}));

vi.mock('./storage', () => ({
  storageService: {
    getSettings: vi.fn(() => ({ clearOnCopy: false })),
    updateSettings: vi.fn((update: Partial<{ clearOnCopy: boolean }>) => ({
      clearOnCopy: false,
      ...(update ?? {}),
    })),
  },
}));

vi.mock('./state', () => ({
  stateManager: {
    getTabRuntimeState: vi.fn(() => ({ enabled: false, annotateMode: false })),
    setTabEnabled: vi.fn(() => ({ enabled: true, annotateMode: false })),
    setAnnotateMode: vi.fn(() => ({ enabled: true, annotateMode: true })),
    getState: vi.fn(() => false),
  },
}));

vi.mock('@/shared/webext', () => ({
  webext: {
    tabs: {
      onUpdated: { addListener: vi.fn() },
      captureVisibleTab: vi.fn<() => Promise<string>>(),
      get: vi.fn<(tabId: number) => Promise<chrome.tabs.Tab>>(),
      sendMessage: vi.fn<(tabId: number, message: unknown) => Promise<unknown>>(),
    },
    scripting: {
      executeScript: vi.fn(),
    },
    runtime: {
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn(),
    },
  },
}));

import { webext } from '@/shared/webext';
import type { Message } from '@/types';

type AsyncMock<TArgs extends unknown[] = unknown[], TResult = unknown> = {
  (...args: TArgs): Promise<TResult>;
  mockResolvedValue: (value: TResult) => unknown;
  mockRejectedValue: (error: unknown) => unknown;
};

const captureVisibleTabMock = webext.tabs.captureVisibleTab as unknown as AsyncMock<
  [unknown?],
  string
>;
const tabGetMock = webext.tabs.get as unknown as AsyncMock<[number], chrome.tabs.Tab>;

// Import after mocks are set up
type OnMessageHandler = (
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => void;

const createMessageHandler = async (): Promise<OnMessageHandler> => {
  // We need to test handleMessage directly, but it's not exported
  // So we'll set up the listener and extract it
  const { setupMessageHandler } = await import('./messages');
  setupMessageHandler();

  const addListenerMock = vi.mocked(webext.runtime.onMessage.addListener);
  const handler = addListenerMock.mock.calls[0]?.[0];
  if (!handler) {
    throw new Error('Message handler was not registered');
  }
  return handler;
};

describe('CAPTURE_VIEWPORT message handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when tabId is missing', async () => {
    const handler = await createMessageHandler();
    const sendResponse = vi.fn();

    const message: Message = { type: 'CAPTURE_VIEWPORT' };
    const sender = { tab: undefined } as chrome.runtime.MessageSender;

    handler(message, sender, sendResponse);

    // Wait for async handler
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Missing tabId for CAPTURE_VIEWPORT',
    });
  });

  it('returns screenshot data URL and viewport dimensions on success', async () => {
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const mockTab = {
      id: 123,
      width: 1920,
      height: 1080,
    };

    captureVisibleTabMock.mockResolvedValue(mockDataUrl);
    tabGetMock.mockResolvedValue(mockTab as chrome.tabs.Tab);

    const handler = await createMessageHandler();
    const sendResponse = vi.fn();

    const message: Message = { type: 'CAPTURE_VIEWPORT' };
    const sender = {
      tab: { id: 123 },
    } as chrome.runtime.MessageSender;

    handler(message, sender, sendResponse);

    // Wait for async handler
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(webext.tabs.captureVisibleTab).toHaveBeenCalledWith({ format: 'png' });
    expect(webext.tabs.get).toHaveBeenCalledWith(123);
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      data: {
        dataUrl: mockDataUrl,
        viewport: {
          width: 1920,
          height: 1080,
          scrollX: 0,
          scrollY: 0,
        },
      },
    });
  });

  it('handles missing tab dimensions gracefully', async () => {
    const mockDataUrl = 'data:image/png;base64,test';
    const mockTab = {
      id: 123,
      width: undefined,
      height: undefined,
    };

    captureVisibleTabMock.mockResolvedValue(mockDataUrl);
    tabGetMock.mockResolvedValue(mockTab as chrome.tabs.Tab);

    const handler = await createMessageHandler();
    const sendResponse = vi.fn();

    const message: Message = { type: 'CAPTURE_VIEWPORT' };
    const sender = {
      tab: { id: 123 },
    } as chrome.runtime.MessageSender;

    handler(message, sender, sendResponse);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      data: {
        dataUrl: mockDataUrl,
        viewport: {
          width: 0,
          height: 0,
          scrollX: 0,
          scrollY: 0,
        },
      },
    });
  });

  it('returns error when captureVisibleTab fails', async () => {
    captureVisibleTabMock.mockRejectedValue(
      new Error('Cannot capture tab: tab is not active')
    );

    const handler = await createMessageHandler();
    const sendResponse = vi.fn();

    const message: Message = { type: 'CAPTURE_VIEWPORT' };
    const sender = {
      tab: { id: 123 },
    } as chrome.runtime.MessageSender;

    handler(message, sender, sendResponse);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Cannot capture tab: tab is not active',
    });
  });

  it('returns error when tabs.get fails', async () => {
    const mockDataUrl = 'data:image/png;base64,test';

    captureVisibleTabMock.mockResolvedValue(mockDataUrl);
    tabGetMock.mockRejectedValue(new Error('Tab not found'));

    const handler = await createMessageHandler();
    const sendResponse = vi.fn();

    const message: Message = { type: 'CAPTURE_VIEWPORT' };
    const sender = {
      tab: { id: 123 },
    } as chrome.runtime.MessageSender;

    handler(message, sender, sendResponse);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Tab not found',
    });
  });
});
