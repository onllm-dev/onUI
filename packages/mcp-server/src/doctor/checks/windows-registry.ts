import { spawnSync } from 'node:child_process';
import { getNativeHostWindowsRegistryPath, getSupportedNativeHostBrowsers } from '../../store/path.js';
import type { CheckResult } from '../types.js';

function formatBrowserName(browser: string): string {
  if (browser === 'firefox') {
    return 'Firefox';
  }
  return browser[0]?.toUpperCase() + browser.slice(1);
}

function formatBrowserList(browsers: readonly string[]): string {
  return browsers.map(formatBrowserName).join(', ');
}

export async function checkWindowsRegistry(platform = process.platform): Promise<CheckResult> {
  if (platform !== 'win32') {
    return {
      name: 'native.windows_registry',
      status: 'ok',
      message: 'Not running on Windows; registry check skipped.',
    };
  }

  const missingBrowsers: string[] = [];
  const checkedPaths: Record<string, string> = {};
  const browsers = [...getSupportedNativeHostBrowsers()];

  for (const browser of browsers) {
    const regPath = getNativeHostWindowsRegistryPath(browser);
    checkedPaths[browser] = regPath;
    const result = spawnSync('reg', ['query', regPath], {
      stdio: 'pipe',
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      missingBrowsers.push(browser);
    }
  }

  if (missingBrowsers.length === 0) {
    return {
      name: 'native.windows_registry',
      status: 'ok',
      message: `Windows registry keys exist for ${formatBrowserList(browsers)} native host registration.`,
      details: checkedPaths,
    };
  }

  if (missingBrowsers.length === browsers.length) {
    return {
      name: 'native.windows_registry',
      status: 'error',
      message: `Windows registry keys are missing for ${formatBrowserList(browsers)} native host registration.`,
      fix: 'Run setup to register native host: pnpm --filter @onui/mcp-server setup',
      details: checkedPaths,
    };
  }

  return {
    name: 'native.windows_registry',
    status: 'warning',
    message: `Windows registry key missing for: ${formatBrowserList(missingBrowsers)}`,
    fix: 'Run setup to register missing browser keys: pnpm --filter @onui/mcp-server setup',
    details: checkedPaths,
  };
}
