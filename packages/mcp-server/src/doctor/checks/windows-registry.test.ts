import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

vi.mock('../../store/path.js', () => ({
  getSupportedNativeHostBrowsers: vi.fn(() => ['chrome', 'edge', 'firefox']),
  getNativeHostWindowsRegistryPath: vi.fn((browser: string) => `HKCU\\Software\\${browser}\\NativeMessagingHosts\\com.onui.native`),
}));

import { spawnSync } from 'node:child_process';
import { checkWindowsRegistry } from './windows-registry.js';

const spawnSyncMock = vi.mocked(spawnSync);

describe('checkWindowsRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips check on non-Windows platforms', async () => {
    const result = await checkWindowsRegistry('darwin');
    expect(result.status).toBe('ok');
    expect(result.message).toContain('Not running on Windows');
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });

  it('returns ok when all browser registry keys exist', async () => {
    spawnSyncMock.mockReturnValueOnce({ status: 0 } as unknown as ReturnType<typeof spawnSync>);
    spawnSyncMock.mockReturnValueOnce({ status: 0 } as unknown as ReturnType<typeof spawnSync>);
    spawnSyncMock.mockReturnValueOnce({ status: 0 } as unknown as ReturnType<typeof spawnSync>);

    const result = await checkWindowsRegistry('win32');
    expect(result.status).toBe('ok');
    expect(result.message).toContain('Chrome, Edge, Firefox');
  });

  it('returns warning when one browser registry key is missing', async () => {
    spawnSyncMock.mockReturnValueOnce({ status: 0 } as unknown as ReturnType<typeof spawnSync>);
    spawnSyncMock.mockReturnValueOnce({ status: 1 } as unknown as ReturnType<typeof spawnSync>);
    spawnSyncMock.mockReturnValueOnce({ status: 0 } as unknown as ReturnType<typeof spawnSync>);

    const result = await checkWindowsRegistry('win32');
    expect(result.status).toBe('warning');
    expect(result.message).toContain('Edge');
  });

  it('returns error when all browser registry keys are missing', async () => {
    spawnSyncMock.mockReturnValueOnce({ status: 1 } as unknown as ReturnType<typeof spawnSync>);
    spawnSyncMock.mockReturnValueOnce({ status: 1 } as unknown as ReturnType<typeof spawnSync>);
    spawnSyncMock.mockReturnValueOnce({ status: 1 } as unknown as ReturnType<typeof spawnSync>);

    const result = await checkWindowsRegistry('win32');
    expect(result.status).toBe('error');
    expect(result.message).toContain('missing for Chrome, Edge, Firefox');
  });
});
