import { describe, expect, it } from 'vitest';
import { getDataDir, getNativeHostManifestPath, getStorePath } from './path.js';

describe('path resolver', () => {
  it('resolves darwin paths', () => {
    const dataDir = getDataDir('darwin');
    expect(dataDir).toContain('Library/Application Support/onui');
    expect(getStorePath('darwin')).toContain('store.v1.json');
    expect(getNativeHostManifestPath('darwin')).toContain('NativeMessagingHosts/com.onui.native.json');
  });

  it('resolves linux paths', () => {
    const dataDir = getDataDir('linux');
    expect(dataDir).toContain('onui');
    expect(getStorePath('linux')).toContain('store.v1.json');
    expect(getNativeHostManifestPath('linux')).toContain('NativeMessagingHosts/com.onui.native.json');
  });
});
