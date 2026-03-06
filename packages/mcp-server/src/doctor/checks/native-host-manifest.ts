import { access, readFile } from 'node:fs/promises';
import {
  getNativeHostManifestPath,
  getSupportedNativeHostBrowsers,
  type NativeHostBrowser,
} from '../../store/path.js';
import {
  buildAllowedExtensionsForBrowser,
  buildAllowedOriginsForBrowser,
} from '../../setup/install-native-host.js';
import type { CheckResult } from '../types.js';

function formatBrowserName(browser: NativeHostBrowser): string {
  if (browser === 'firefox') {
    return 'Firefox';
  }
  return `${browser.charAt(0).toUpperCase()}${browser.slice(1)}`;
}

function formatBrowserList(browsers: NativeHostBrowser[]): string {
  return browsers.map(formatBrowserName).join(', ');
}

export async function checkNativeHostManifest(): Promise<CheckResult> {
  const browsers = [...getSupportedNativeHostBrowsers()];
  const missingBrowsers: NativeHostBrowser[] = [];
  const invalidBrowsers: NativeHostBrowser[] = [];
  const missingAllowlistBrowsers: NativeHostBrowser[] = [];
  const details: Record<string, unknown> = {};

  for (const browser of browsers) {
    const manifestPath = getNativeHostManifestPath(process.platform, browser);

    try {
      await access(manifestPath);
      const raw = await readFile(manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as {
        path?: string;
        name?: string;
        allowed_origins?: unknown;
        allowed_extensions?: unknown;
      };

      if (!parsed.path || !parsed.name) {
        invalidBrowsers.push(browser);
        details[browser] = { manifestPath };
        continue;
      }

      const expectedAllowlist = browser === 'firefox'
        ? new Set(buildAllowedExtensionsForBrowser(browser))
        : new Set(buildAllowedOriginsForBrowser(browser));
      const rawAllowlist = browser === 'firefox' ? parsed.allowed_extensions : parsed.allowed_origins;
      const actualAllowlist = Array.isArray(rawAllowlist)
        ? rawAllowlist.filter((entry): entry is string => typeof entry === 'string')
        : [];
      const missingExpectedAllowlist = Array.from(expectedAllowlist).filter(
        (entry) => !actualAllowlist.includes(entry)
      );

      details[browser] = {
        manifestPath,
        hostName: parsed.name,
        path: parsed.path,
        ...(browser === 'firefox'
          ? {
              allowedExtensions: actualAllowlist,
              missingExtensions: missingExpectedAllowlist,
            }
          : {
              allowedOrigins: actualAllowlist,
              missingOrigins: missingExpectedAllowlist,
            }),
      };

      if (missingExpectedAllowlist.length > 0) {
        missingAllowlistBrowsers.push(browser);
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
      message: `Native manifests not found for ${formatBrowserList(browsers)}`,
      fix: 'Run setup to install native host: pnpm --filter @onui/mcp-server setup',
      details,
    };
  }

  if (invalidBrowsers.length > 0) {
    return {
      name: 'native.manifest',
      status: 'error',
      message: `Native manifest is invalid for: ${formatBrowserList(invalidBrowsers)}`,
      fix: 'Rerun setup: pnpm --filter @onui/mcp-server setup',
      details,
    };
  }

  if (missingBrowsers.length > 0) {
    return {
      name: 'native.manifest',
      status: 'warning',
      message: `Native manifest is missing for: ${formatBrowserList(missingBrowsers)}`,
      fix: 'Rerun setup to install all browser manifests: pnpm --filter @onui/mcp-server setup',
      details,
    };
  }

  if (missingAllowlistBrowsers.length > 0) {
    return {
      name: 'native.manifest',
      status: 'warning',
      message: `Native manifest is missing expected allowlist entries for: ${formatBrowserList(missingAllowlistBrowsers)}`,
      fix: 'Rerun setup to refresh native host allowlists: pnpm --filter @onui/mcp-server setup',
      details,
    };
  }

  return {
    name: 'native.manifest',
    status: 'ok',
    message: `Native manifests exist for ${formatBrowserList(browsers)}`,
    details,
  };
}
