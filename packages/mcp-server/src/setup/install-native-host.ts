import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  getDataDir,
  getNativeHostDir,
  getNativeHostManifestPath,
  getNativeHostName,
  getNativeHostWindowsRegistryPath,
} from '../store/path.js';

const EXTENSION_ID = 'fnkengnadapimmlepnjienecfoekgacp';

export interface NativeHostInstallResult {
  wrapperPath: string;
  manifestPath: string;
  hostName: string;
}

function createUnixWrapper(cliPath: string): string {
  return `#!/usr/bin/env bash\nnode "${cliPath}" native-host\n`;
}

function createWindowsWrapper(cliPath: string): string {
  return `@echo off\r\nnode "${cliPath}" native-host\r\n`;
}

export async function installNativeHost(cliPath: string): Promise<NativeHostInstallResult> {
  const platform = process.platform;
  const runtimeDir = join(getDataDir(platform), 'runtime');
  await mkdir(runtimeDir, { recursive: true });

  const wrapperPath =
    platform === 'win32' ? join(runtimeDir, 'onui-native-host.cmd') : join(runtimeDir, 'onui-native-host.sh');

  if (platform === 'win32') {
    await writeFile(wrapperPath, createWindowsWrapper(cliPath), 'utf8');
  } else {
    await writeFile(wrapperPath, createUnixWrapper(cliPath), 'utf8');
    await chmod(wrapperPath, 0o755);
  }

  const manifestPath = getNativeHostManifestPath(platform);
  await mkdir(getNativeHostDir(platform), { recursive: true });

  const manifest = {
    name: getNativeHostName(),
    description: 'onUI native messaging host',
    path: wrapperPath,
    type: 'stdio',
    allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  if (platform === 'win32') {
    const regPath = getNativeHostWindowsRegistryPath();
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
      throw new Error(`Failed to register native host in registry: ${result.stderr || result.stdout}`);
    }
  }

  return {
    wrapperPath,
    manifestPath,
    hostName: getNativeHostName(),
  };
}
