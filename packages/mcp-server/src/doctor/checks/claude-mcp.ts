import { spawnSync } from 'node:child_process';
import type { CheckResult } from '../types.js';

export async function checkClaudeMcpRegistration(): Promise<CheckResult> {
  const exists = spawnSync('claude', ['--version'], { stdio: 'pipe', encoding: 'utf8' });
  if (exists.status !== 0) {
    return {
      name: 'mcp.claude',
      status: 'warning',
      message: 'claude CLI not found; skipping Claude MCP registration check.',
      fix: 'Install Claude Code CLI if you want Claude MCP integration.',
    };
  }

  const list = spawnSync('claude', ['mcp', 'list'], { stdio: 'pipe', encoding: 'utf8' });
  if (list.status === 0 && `${list.stdout}${list.stderr}`.includes('onui-local')) {
    return {
      name: 'mcp.claude',
      status: 'ok',
      message: 'Claude MCP registration found: onui-local',
    };
  }

  return {
    name: 'mcp.claude',
    status: 'warning',
    message: 'Claude MCP registration onui-local is missing.',
    fix: 'Run setup: pnpm --filter @onui/mcp-server run setup',
  };
}
