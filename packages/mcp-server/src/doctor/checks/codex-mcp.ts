import { spawnSync } from 'node:child_process';
import type { CheckResult } from '../types.js';

export async function checkCodexMcpRegistration(): Promise<CheckResult> {
  const exists = spawnSync('codex', ['--version'], { stdio: 'pipe', encoding: 'utf8' });
  if (exists.status !== 0) {
    return {
      name: 'mcp.codex',
      status: 'warning',
      message: 'codex CLI not found; skipping Codex MCP registration check.',
      fix: 'Install Codex CLI if you want Codex MCP integration.',
    };
  }

  const list = spawnSync('codex', ['mcp', 'list'], { stdio: 'pipe', encoding: 'utf8' });
  if (list.status === 0 && `${list.stdout}${list.stderr}`.includes('onui-local')) {
    return {
      name: 'mcp.codex',
      status: 'ok',
      message: 'Codex MCP registration found: onui-local',
    };
  }

  return {
    name: 'mcp.codex',
    status: 'warning',
    message: 'Codex MCP registration onui-local is missing.',
    fix: 'Run setup: pnpm --filter @onui/mcp-server run setup',
  };
}
