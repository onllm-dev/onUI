import { homedir } from 'node:os';
import { join } from 'node:path';

export type SupportedPlatform = 'darwin' | 'linux' | 'win32';
export type NativeHostBrowser = 'chrome' | 'edge' | 'firefox';

const SUPPORTED_NATIVE_HOST_BROWSERS: readonly NativeHostBrowser[] = ['chrome', 'edge', 'firefox'] as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required for this platform.`);
  }
  return value;
}

export function getDataDir(platform = process.platform): string {
  const home = homedir();

  switch (platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'onui');
    case 'linux': {
      const dataHome = process.env.XDG_DATA_HOME ?? join(home, '.local', 'share');
      return join(dataHome, 'onui');
    }
    case 'win32':
      return join(requireEnv('APPDATA'), 'onui');
    default:
      return join(home, '.onui');
  }
}

export function getStorePath(platform = process.platform): string {
  return join(getDataDir(platform), 'store.v1.json');
}

export function getNativeHostName(): string {
  return 'com.onui.native';
}

export function getSupportedNativeHostBrowsers(): readonly NativeHostBrowser[] {
  return SUPPORTED_NATIVE_HOST_BROWSERS;
}

export function getNativeHostDir(
  platform = process.platform,
  browser: NativeHostBrowser = 'chrome'
): string {
  const home = homedir();

  switch (platform) {
    case 'darwin': {
      if (browser === 'firefox') {
        return join(home, 'Library', 'Application Support', 'Mozilla', 'NativeMessagingHosts');
      }

      const browserRoot = browser === 'edge' ? join('Microsoft Edge') : join('Google', 'Chrome');
      return join(home, 'Library', 'Application Support', browserRoot, 'NativeMessagingHosts');
    }
    case 'linux': {
      if (browser === 'firefox') {
        return join(home, '.mozilla', 'native-messaging-hosts');
      }

      const configHome = process.env.XDG_CONFIG_HOME ?? join(home, '.config');
      const browserDir = browser === 'edge' ? 'microsoft-edge' : 'google-chrome';
      return join(configHome, browserDir, 'NativeMessagingHosts');
    }
    case 'win32':
      return join(getDataDir(platform), 'native-host');
    default:
      return join(getDataDir(platform), 'native-host');
  }
}

export function getNativeHostManifestPath(
  platform = process.platform,
  browser: NativeHostBrowser = 'chrome'
): string {
  return join(getNativeHostDir(platform, browser), `${getNativeHostName()}.json`);
}

export function getNativeHostWindowsRegistryPath(browser: NativeHostBrowser = 'chrome'): string {
  const browserRegistryRoot = browser === 'edge'
    ? 'HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts'
    : browser === 'firefox'
      ? 'HKCU\\Software\\Mozilla\\NativeMessagingHosts'
      : 'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts';
  return `${browserRegistryRoot}\\${getNativeHostName()}`;
}
