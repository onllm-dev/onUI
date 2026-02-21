import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { Popup } from './Popup';

vi.mock('@/content/utils/clipboard', () => ({
  copyToClipboard: vi.fn(async () => true),
}));

const queryMock = vi.fn();
const sendMessageMock = vi.fn();
const addListenerMock = vi.fn();
const removeListenerMock = vi.fn();

const tabId = 101;

function getResponseFor(message: unknown) {
  const payload = message as { type?: string };
  if (payload.type === 'GET_TAB_RUNTIME_STATE') {
    return Promise.resolve({ success: true, data: { enabled: false } });
  }

  if (payload.type === 'GET_SYNC_STATUS') {
    return Promise.resolve({ success: true, data: { status: 'unavailable', lastError: null } });
  }

  if (payload.type === 'SET_TAB_ENABLED') {
    return Promise.resolve({ success: true, data: { enabled: true } });
  }

  return Promise.resolve({ success: false });
}

describe('Popup MCP onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36',
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });

    queryMock.mockResolvedValue([{ id: tabId, url: 'https://example.com' }]);
    sendMessageMock.mockImplementation((message: unknown) => getResponseFor(message));

    Object.defineProperty(globalThis, 'chrome', {
      value: {
        tabs: {
          query: queryMock,
        },
        runtime: {
          sendMessage: sendMessageMock,
          onMessage: {
            addListener: addListenerMock,
            removeListener: removeListenerMock,
          },
        },
      },
      configurable: true,
    });
  });

  it('shows MCP setup actions when local bridge is unavailable', async () => {
    render(<Popup />);

    await screen.findByText('Local bridge: unavailable');

    expect(screen.getByText('Copy MCP setup command')).toBeTruthy();
    expect(screen.getByText('Open MCP setup guide')).toBeTruthy();
  });

  it('shows GitHub and Buy Me a Coffee links in footer', async () => {
    render(<Popup />);

    await screen.findByText('Local bridge: unavailable');

    const githubLink = screen.getByRole('link', { name: 'GitHub' }) as HTMLAnchorElement;
    const coffeeLink = screen.getByRole('link', { name: 'Buy Me a Coffee' }) as HTMLAnchorElement;

    expect(githubLink.href).toContain('https://github.com/onllm-dev/onUI');
    expect(coffeeLink.href).toContain('https://buymeacoffee.com/tushar_s');
  });

  it('copies Unix MCP setup command for non Windows platforms', async () => {
    const { copyToClipboard } = await import('@/content/utils/clipboard');
    const copyMock = vi.mocked(copyToClipboard);

    render(<Popup />);
    const user = userEvent.setup();

    const button = await screen.findByText('Copy MCP setup command');
    await user.click(button);

    expect(copyMock).toHaveBeenCalledWith(
      'curl -fsSL https://github.com/onllm-dev/onUI/releases/latest/download/install.sh | bash -s -- --mcp'
    );

    await waitFor(() => {
      expect(screen.getByText('Copied setup command')).toBeTruthy();
    });
  });

  it('copies Windows MCP setup command for Windows platforms', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    });

    const { copyToClipboard } = await import('@/content/utils/clipboard');
    const copyMock = vi.mocked(copyToClipboard);

    render(<Popup />);
    const user = userEvent.setup();

    const button = await screen.findByText('Copy MCP setup command');
    await user.click(button);

    expect(copyMock).toHaveBeenCalledWith(
      'irm https://github.com/onllm-dev/onUI/releases/latest/download/install.ps1 | iex'
    );
  });
});
