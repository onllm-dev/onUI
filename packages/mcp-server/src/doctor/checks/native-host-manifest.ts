import { access, readFile } from 'node:fs/promises';
import { getNativeHostManifestPath } from '../../store/path.js';
import { buildChromeAllowedOrigins } from '../../setup/install-native-host.js';
import type { CheckResult } from '../types.js';

export async function checkNativeHostManifest(): Promise<CheckResult> {
  const manifestPath = getNativeHostManifestPath();

  try {
    await access(manifestPath);
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as { path?: string; name?: string; allowed_origins?: unknown };

    if (!parsed.path || !parsed.name) {
      return {
        name: 'native.manifest',
        status: 'error',
        message: `Manifest is invalid at ${manifestPath}`,
        fix: 'Rerun setup: pnpm --filter @onui/mcp-server setup',
      };
    }

    const expectedOrigins = new Set(buildChromeAllowedOrigins());
    const allowedOrigins = Array.isArray(parsed.allowed_origins)
      ? parsed.allowed_origins.filter((origin): origin is string => typeof origin === 'string')
      : [];
    const missingExpectedOrigins = Array.from(expectedOrigins).filter(
      (origin) => !allowedOrigins.includes(origin)
    );

    if (missingExpectedOrigins.length > 0) {
      return {
        name: 'native.manifest',
        status: 'warning',
        message: `Native manifest is missing expected Chrome origins at ${manifestPath}`,
        fix: 'Rerun setup to refresh allowed_origins: pnpm --filter @onui/mcp-server setup',
        details: {
          missingOrigins: missingExpectedOrigins,
          allowedOrigins,
        },
      };
    }

    return {
      name: 'native.manifest',
      status: 'ok',
      message: `Native manifest exists at ${manifestPath}`,
      details: {
        hostName: parsed.name,
        path: parsed.path,
        allowedOrigins,
      },
    };
  } catch {
    return {
      name: 'native.manifest',
      status: 'warning',
      message: `Native manifest not found at ${manifestPath}`,
      fix: 'Run setup to install native host: pnpm --filter @onui/mcp-server setup',
    };
  }
}
