import { access, readFile } from 'node:fs/promises';
import { getNativeHostManifestPath } from '../../store/path.js';
import type { CheckResult } from '../types.js';

export async function checkNativeHostManifest(): Promise<CheckResult> {
  const manifestPath = getNativeHostManifestPath();

  try {
    await access(manifestPath);
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as { path?: string; name?: string };

    if (!parsed.path || !parsed.name) {
      return {
        name: 'native.manifest',
        status: 'error',
        message: `Manifest is invalid at ${manifestPath}`,
        fix: 'Rerun setup: pnpm --filter @onui/mcp-server run setup',
      };
    }

    return {
      name: 'native.manifest',
      status: 'ok',
      message: `Native manifest exists at ${manifestPath}`,
      details: {
        hostName: parsed.name,
        path: parsed.path,
      },
    };
  } catch {
    return {
      name: 'native.manifest',
      status: 'warning',
      message: `Native manifest not found at ${manifestPath}`,
      fix: 'Run setup to install native host: pnpm --filter @onui/mcp-server run setup',
    };
  }
}
