import { spawnSync } from 'node:child_process';
import { getNativeHostWindowsRegistryPath } from '../../store/path.js';
import type { CheckResult } from '../types.js';

export async function checkWindowsRegistry(): Promise<CheckResult> {
  if (process.platform !== 'win32') {
    return {
      name: 'native.windows_registry',
      status: 'ok',
      message: 'Not running on Windows; registry check skipped.',
    };
  }

  const regPath = getNativeHostWindowsRegistryPath();
  const result = spawnSync('reg', ['query', regPath], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.status === 0) {
    return {
      name: 'native.windows_registry',
      status: 'ok',
      message: `Windows registry key exists: ${regPath}`,
    };
  }

  return {
    name: 'native.windows_registry',
    status: 'error',
    message: `Windows registry key missing: ${regPath}`,
    fix: 'Run setup to register native host: pnpm --filter @onui/mcp-server setup',
  };
}
