import { access, readFile } from 'node:fs/promises';
import {
  getNativeHostManifestPath,
  getSupportedNativeHostBrowsers,
  type NativeHostBrowser,
} from '../../store/path.js';
import { buildAllowedOriginsForBrowser } from '../../setup/install-native-host.js';
import type { CheckResult } from '../types.js';

export async function checkNativeHostManifest(): Promise<CheckResult> {
  const browsers = [...getSupportedNativeHostBrowsers()];
  const missingBrowsers: NativeHostBrowser[] = [];
  const invalidBrowsers: NativeHostBrowser[] = [];
  const missingOriginBrowsers: NativeHostBrowser[] = [];
  const details: Record<string, unknown> = {};

  for (const browser of browsers) {
    const manifestPath = getNativeHostManifestPath(process.platform, browser);

    try {
      await access(manifestPath);
      const raw = await readFile(manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as { path?: string; name?: string; allowed_origins?: unknown };

      if (!parsed.path || !parsed.name) {
        invalidBrowsers.push(browser);
        details[browser] = { manifestPath };
        continue;
      }

      const expectedOrigins = new Set(buildAllowedOriginsForBrowser(browser));
      const allowedOrigins = Array.isArray(parsed.allowed_origins)
        ? parsed.allowed_origins.filter((origin): origin is string => typeof origin === 'string')
        : [];
      const missingExpectedOrigins = Array.from(expectedOrigins).filter(
        (origin) => !allowedOrigins.includes(origin)
      );

      details[browser] = {
        manifestPath,
        hostName: parsed.name,
        path: parsed.path,
        allowedOrigins,
        missingOrigins: missingExpectedOrigins,
      };

      if (missingExpectedOrigins.length > 0) {
        missingOriginBrowsers.push(browser);
      }
    } catch {
      missingBrowsers.push(browser);
      details[browser] = { manifestPath };
    }
  }

  if (missingBrowsers.length === browsers.length) {
    return {
      name: 'native.manifest',
      status: 'warning',
      message: 'Native manifests not found for Chrome or Edge',
      fix: 'Run setup to install native host: pnpm --filter @onui/mcp-server setup',
      details,
    };
  }

  if (invalidBrowsers.length > 0) {
    return {
      name: 'native.manifest',
      status: 'error',
      message: `Native manifest is invalid for: ${invalidBrowsers.join(', ')}`,
      fix: 'Rerun setup: pnpm --filter @onui/mcp-server setup',
      details,
    };
  }

  if (missingBrowsers.length > 0) {
    return {
      name: 'native.manifest',
      status: 'warning',
      message: `Native manifest is missing for: ${missingBrowsers.join(', ')}`,
      fix: 'Rerun setup to install all browser manifests: pnpm --filter @onui/mcp-server setup',
      details,
    };
  }

  if (missingOriginBrowsers.length > 0) {
    return {
      name: 'native.manifest',
      status: 'warning',
      message: `Native manifest is missing expected origins for: ${missingOriginBrowsers.join(', ')}`,
      fix: 'Rerun setup to refresh allowed_origins: pnpm --filter @onui/mcp-server setup',
      details,
    };
  }

  return {
    name: 'native.manifest',
    status: 'ok',
    message: 'Native manifests exist for Chrome and Edge',
    details,
  };
}
