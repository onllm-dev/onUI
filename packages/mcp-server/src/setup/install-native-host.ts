import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  getDataDir,
  getNativeHostDir,
  getNativeHostManifestPath,
  getNativeHostName,
  getSupportedNativeHostBrowsers,
  getNativeHostWindowsRegistryPath,
  type NativeHostBrowser,
} from '../store/path.js';

const CHROME_WEB_STORE_EXTENSION_ID = 'hllgijkdhegkpooopdhbfdjialkhlkan';
const CHROMIUM_UNPACKED_EXTENSION_ID = 'fnkengnadapimmlepnjienecfoekgacp';
const DEFAULT_CHROME_EXTENSION_IDS = [CHROME_WEB_STORE_EXTENSION_ID, CHROMIUM_UNPACKED_EXTENSION_ID] as const;
const DEFAULT_EDGE_EXTENSION_IDS = [CHROMIUM_UNPACKED_EXTENSION_ID, CHROME_WEB_STORE_EXTENSION_ID] as const;

function normalizeExtensionId(id: string): string | undefined {
  const normalized = id.trim().toLowerCase();
  if (!/^[a-p]{32}$/.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function parseEnvExtensionIds(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export function buildAllowedOrigins(extensionIds: readonly string[]): string[] {
  const deduped = new Set<string>();

  for (const id of extensionIds) {
    const normalized = normalizeExtensionId(id);
    if (normalized) {
      deduped.add(normalized);
    }
  }

  return Array.from(deduped).map((id) => `chrome-extension://${id}/`);
}

export function buildChromeAllowedOrigins(
  extensionIds: readonly string[] = DEFAULT_CHROME_EXTENSION_IDS
): string[] {
  return buildAllowedOrigins(extensionIds);
}

export function buildEdgeAllowedOrigins(extensionIds: readonly string[] = DEFAULT_EDGE_EXTENSION_IDS): string[] {
  return buildAllowedOrigins(extensionIds);
}

export function buildAllowedOriginsForBrowser(browser: NativeHostBrowser): string[] {
  const extraShared = parseEnvExtensionIds(process.env.ONUI_EXTRA_EXTENSION_IDS);

  if (browser === 'edge') {
    const edgeSpecific = parseEnvExtensionIds(process.env.ONUI_EDGE_EXTENSION_IDS);
    return buildEdgeAllowedOrigins([...DEFAULT_EDGE_EXTENSION_IDS, ...edgeSpecific, ...extraShared]);
  }

  const chromeSpecific = parseEnvExtensionIds(process.env.ONUI_CHROME_EXTENSION_IDS);
  return buildChromeAllowedOrigins([...DEFAULT_CHROME_EXTENSION_IDS, ...chromeSpecific, ...extraShared]);
}

export interface NativeHostInstallResult {
  wrapperPath: string;
  manifestPath: string;
  manifestPaths: Record<NativeHostBrowser, string>;
  registeredBrowsers: NativeHostBrowser[];
  windowsRegistryPaths: Partial<Record<NativeHostBrowser, string>>;
  hostName: string;
  nodeBinary: string;
}

function createUnixWrapper(cliPath: string, nodeBinary: string): string {
  return `#!/usr/bin/env bash\n"${nodeBinary}" "${cliPath}" native-host\n`;
}

function createWindowsWrapper(cliPath: string, nodeBinary: string): string {
  return `@echo off\r\n"${nodeBinary}" "${cliPath}" native-host\r\n`;
}

export async function installNativeHost(
  cliPath: string,
  nodeBinary = process.execPath
): Promise<NativeHostInstallResult> {
  const platform = process.platform;
  const runtimeDir = join(getDataDir(platform), 'runtime');
  await mkdir(runtimeDir, { recursive: true });

  const wrapperPath =
    platform === 'win32' ? join(runtimeDir, 'onui-native-host.cmd') : join(runtimeDir, 'onui-native-host.sh');

  if (platform === 'win32') {
    await writeFile(wrapperPath, createWindowsWrapper(cliPath, nodeBinary), 'utf8');
  } else {
    await writeFile(wrapperPath, createUnixWrapper(cliPath, nodeBinary), 'utf8');
    await chmod(wrapperPath, 0o755);
  }

  const browsers = [...getSupportedNativeHostBrowsers()];
  const manifestPaths = {} as Record<NativeHostBrowser, string>;
  const windowsRegistryPaths: Partial<Record<NativeHostBrowser, string>> = {};

  for (const browser of browsers) {
    const manifestPath = getNativeHostManifestPath(platform, browser);
    await mkdir(getNativeHostDir(platform, browser), { recursive: true });

    const manifest = {
      name: getNativeHostName(),
      description: 'onUI native messaging host',
      path: wrapperPath,
      type: 'stdio',
      allowed_origins: buildAllowedOriginsForBrowser(browser),
    };

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    manifestPaths[browser] = manifestPath;

    if (platform === 'win32') {
      const regPath = getNativeHostWindowsRegistryPath(browser);
      const command = [
        'add',
        regPath,
        '/ve',
        '/t',
        'REG_SZ',
        '/d',
        manifestPath,
        '/f',
      ];

      const result = spawnSync('reg', command, {
        stdio: 'pipe',
        encoding: 'utf8',
      });

      if (result.status !== 0) {
        throw new Error(
          `Failed to register native host for ${browser} in registry: ${result.stderr || result.stdout}`
        );
      }

      windowsRegistryPaths[browser] = regPath;
    }
  }

  return {
    wrapperPath,
    manifestPath: manifestPaths.chrome,
    manifestPaths,
    registeredBrowsers: browsers,
    windowsRegistryPaths,
    hostName: getNativeHostName(),
    nodeBinary,
  };
}
