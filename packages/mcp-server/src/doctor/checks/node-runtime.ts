import { access } from 'node:fs/promises';
import type { CheckResult } from '../types.js';

export async function checkNodeRuntime(cliPath: string): Promise<CheckResult> {
  try {
    await access(cliPath);
    return {
      name: 'node.runtime',
      status: 'ok',
      message: `CLI entry found at ${cliPath}`,
    };
  } catch {
    return {
      name: 'node.runtime',
      status: 'error',
      message: `CLI entry not found at ${cliPath}`,
      fix: 'Reinstall package and rerun: pnpm --filter @onui/mcp-server run setup',
    };
  }
}
