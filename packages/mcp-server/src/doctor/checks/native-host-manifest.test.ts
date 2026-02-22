import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../store/path.js', () => ({
  getNativeHostManifestPath: vi.fn(() => '/tmp/com.onui.native.json'),
}));

import { access, readFile } from 'node:fs/promises';
import { checkNativeHostManifest } from './native-host-manifest.js';

const accessMock = vi.mocked(access);
const readFileMock = vi.mocked(readFile);

describe('checkNativeHostManifest', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns ok when manifest includes expected Chrome origins', async () => {
    accessMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue(
      JSON.stringify({
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_origins: [
          'chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/',
          'chrome-extension://fnkengnadapimmlepnjienecfoekgacp/',
        ],
      })
    );

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('ok');
    expect(result.name).toBe('native.manifest');
  });

  it('returns warning when expected origins are missing', async () => {
    accessMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue(
      JSON.stringify({
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
        allowed_origins: ['chrome-extension://fnkengnadapimmlepnjienecfoekgacp/'],
      })
    );

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('warning');
    expect(result.message).toContain('missing expected Chrome origins');
    expect(result.fix).toContain('pnpm --filter @onui/mcp-server setup');
  });

  it('returns warning when allowed_origins is absent', async () => {
    accessMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue(
      JSON.stringify({
        name: 'com.onui.native',
        path: '/tmp/onui-native-host.sh',
      })
    );

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('warning');
  });

  it('returns error when required manifest fields are invalid', async () => {
    accessMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue(JSON.stringify({ name: 'com.onui.native' }));

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('error');
    expect(result.message).toContain('Manifest is invalid');
  });

  it('returns warning when manifest file does not exist', async () => {
    accessMock.mockRejectedValue(new Error('not found'));

    const result = await checkNativeHostManifest();
    expect(result.status).toBe('warning');
    expect(result.message).toContain('Native manifest not found');
  });
});
