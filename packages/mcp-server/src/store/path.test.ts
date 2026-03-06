import { describe, expect, it } from 'vitest';
import { getDataDir, getNativeHostManifestPath, getNativeHostWindowsRegistryPath, getStorePath } from './path.js';

describe('path resolver', () => {
  it('resolves darwin paths', () => {
    const dataDir = getDataDir('darwin');
    expect(dataDir).toContain('Library/Application Support/onui');
    expect(getStorePath('darwin')).toContain('store.v1.json');
    expect(getNativeHostManifestPath('darwin', 'chrome')).toContain('Google/Chrome/NativeMessagingHosts/com.onui.native.json');
    expect(getNativeHostManifestPath('darwin', 'edge')).toContain(
      'Microsoft Edge/NativeMessagingHosts/com.onui.native.json'
    );
    expect(getNativeHostManifestPath('darwin', 'firefox')).toContain(
      'Mozilla/NativeMessagingHosts/com.onui.native.json'
    );
  });

  it('resolves linux paths', () => {
    const dataDir = getDataDir('linux');
    expect(dataDir).toContain('onui');
    expect(getStorePath('linux')).toContain('store.v1.json');
    expect(getNativeHostManifestPath('linux', 'chrome')).toContain(
      'google-chrome/NativeMessagingHosts/com.onui.native.json'
    );
    expect(getNativeHostManifestPath('linux', 'edge')).toContain(
      'microsoft-edge/NativeMessagingHosts/com.onui.native.json'
    );
    expect(getNativeHostManifestPath('linux', 'firefox')).toContain(
      '.mozilla/native-messaging-hosts/com.onui.native.json'
    );
  });

  it('resolves browser-specific windows registry paths', () => {
    expect(getNativeHostWindowsRegistryPath('chrome')).toContain(
      'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.onui.native'
    );
    expect(getNativeHostWindowsRegistryPath('edge')).toContain(
      'HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.onui.native'
    );
    expect(getNativeHostWindowsRegistryPath('firefox')).toContain(
      'HKCU\\Software\\Mozilla\\NativeMessagingHosts\\com.onui.native'
    );
  });
});
