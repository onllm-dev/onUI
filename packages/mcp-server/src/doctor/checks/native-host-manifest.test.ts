import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../store/path.js', () => ({
  getSupportedNativeHostBrowsers: vi.fn(() => ['chrome', 'edge', 'firefox']),
  getNativeHostManifestPath: vi.fn((_platform: string, browser: string) => `/tmp/com.onui.native.${browser}.json`),
}));

import { access, readFile } from 'node:fs/promises';
import { checkNativeHostManifest } from './native-host-manifest.js';

const accessMock = vi.mocked(access);
const readFileMock = vi.mocked(readFile);

describe('checkNativeHostManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockManifestRead(manifestByPath: Record<string, unknown>): void {
    accessMock.mockImplementation(async (path) => {
      if (typeof path === 'string' && manifestByPath[path]) {
        return;
      }
      throw new Error('not found');
    });
    readFileMock.mockImplementation(async (path) => JSON.stringify(manifestByPath[String(path)]));
  }

  it('returns ok when manifests include expected allowlists for all browsers', async () => {
    mockManifestRead({
      '/tmp/com.onui.native.chrome.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_origins: [
          'chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/',
          'chrome-extension://fnkengnadapimmlepnjienecfoekgacp/',
        ],
      },
      '/tmp/com.onui.native.edge.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_origins: [
          'chrome-extension://fnkengnadapimmlepnjienecfoekgacp/',
          'chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/',
        ],
      },
      '/tmp/com.onui.native.firefox.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_extensions: ['onui@onllm.dev'],
      },
    });

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('ok');
    expect(result.name).toBe('native.manifest');
  });

  it('returns warning when manifest is missing for one browser', async () => {
    mockManifestRead({
      '/tmp/com.onui.native.chrome.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_origins: [
          'chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/',
          'chrome-extension://fnkengnadapimmlepnjienecfoekgacp/',
        ],
      },
      '/tmp/com.onui.native.firefox.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_extensions: ['onui@onllm.dev'],
      },
    });

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('warning');
    expect(result.message).toContain('missing for');
    expect(result.fix).toContain('pnpm --filter @onui/mcp-server setup');
  });

  it('returns warning when expected allowlist entries are missing', async () => {
    mockManifestRead({
      '/tmp/com.onui.native.chrome.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_origins: ['chrome-extension://fnkengnadapimmlepnjienecfoekgacp/'],
      },
      '/tmp/com.onui.native.edge.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_origins: ['chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/'],
      },
      '/tmp/com.onui.native.firefox.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_extensions: [],
      },
    });

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('warning');
    expect(result.message).toContain('missing expected allowlist entries');
  });

  it('returns error when required manifest fields are invalid', async () => {
    mockManifestRead({
      '/tmp/com.onui.native.chrome.json': {
        name: 'com.onui.native',
      },
      '/tmp/com.onui.native.edge.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_origins: [
          'chrome-extension://fnkengnadapimmlepnjienecfoekgacp/',
          'chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/',
        ],
      },
      '/tmp/com.onui.native.firefox.json': {
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_extensions: ['onui@onllm.dev'],
      },
    });

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('error');
    expect(result.message).toContain('invalid for');
  });

  it('returns warning when no manifest exists for either browser', async () => {
    accessMock.mockRejectedValue(new Error('not found'));

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('warning');
    expect(result.message).toContain('not found for Chrome, Edge, Firefox');
  });
});
