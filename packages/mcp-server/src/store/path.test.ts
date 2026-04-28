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

  it('resolves browser-specific win32 native host manifest paths', () => {
    const originalAppData = process.env.APPDATA;
    process.env.APPDATA = 'C:\\Users\\onui\\AppData\\Roaming';

    try {
      const chromePath = getNativeHostManifestPath('win32', 'chrome');
      const edgePath = getNativeHostManifestPath('win32', 'edge');
      const firefoxPath = getNativeHostManifestPath('win32', 'firefox');

      expect(new Set([chromePath, edgePath, firefoxPath]).size).toBe(3);
      expect(chromePath.split(/[\\/]+/)).toContain('chrome');
      expect(edgePath.split(/[\\/]+/)).toContain('edge');
      expect(firefoxPath.split(/[\\/]+/)).toContain('firefox');
      expect(chromePath).toContain('com.onui.native.json');
      expect(edgePath).toContain('com.onui.native.json');
      expect(firefoxPath).toContain('com.onui.native.json');
    } finally {
      if (originalAppData === undefined) {
        delete process.env.APPDATA;
      } else {
        process.env.APPDATA = originalAppData;
      }
    }
  });
});
