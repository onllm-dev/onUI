import { homedir } from 'node:os';
import { join } from 'node:path';

export type SupportedPlatform = 'darwin' | 'linux' | 'win32';

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

export function getNativeHostDir(platform = process.platform): string {
  const home = homedir();

  switch (platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts');
    case 'linux': {
      const configHome = process.env.XDG_CONFIG_HOME ?? join(home, '.config');
      return join(configHome, 'google-chrome', 'NativeMessagingHosts');
    }
    case 'win32':
      return join(getDataDir(platform), 'native-host');
    default:
      return join(getDataDir(platform), 'native-host');
  }
}

export function getNativeHostManifestPath(platform = process.platform): string {
  return join(getNativeHostDir(platform), `${getNativeHostName()}.json`);
}

export function getNativeHostWindowsRegistryPath(): string {
  return 'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.onui.native';
}
