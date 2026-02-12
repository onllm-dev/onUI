import { spawnSync } from 'node:child_process';

export interface CodexConfigResult {
  configured: boolean;
  skipped: boolean;
  message: string;
}

function commandExists(command: string): boolean {
  const result = spawnSync(command, ['--version'], { stdio: 'pipe', encoding: 'utf8' });
  return result.status === 0;
}

export function configureCodexMcp(cliPath: string): CodexConfigResult {
  if (!commandExists('codex')) {
    return {
      configured: false,
      skipped: true,
      message: 'codex CLI not found; skipping Codex MCP registration.',
    };
  }

  spawnSync('codex', ['mcp', 'remove', 'onui-local'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const add = spawnSync('codex', ['mcp', 'add', 'onui-local', '--', 'node', cliPath, 'mcp'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (add.status !== 0) {
    return {
      configured: false,
      skipped: false,
      message: `Failed to configure Codex MCP: ${add.stderr || add.stdout}`,
    };
  }

  return {
    configured: true,
    skipped: false,
    message: 'Codex MCP server configured as onui-local.',
  };
}
