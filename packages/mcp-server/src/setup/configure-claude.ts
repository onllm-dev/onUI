import { spawnSync } from 'node:child_process';

export interface ClaudeConfigResult {
  configured: boolean;
  skipped: boolean;
  message: string;
}

function commandExists(command: string): boolean {
  const result = spawnSync(command, ['--version'], { stdio: 'pipe', encoding: 'utf8' });
  return result.status === 0;
}

export function configureClaudeMcp(cliPath: string): ClaudeConfigResult {
  if (!commandExists('claude')) {
    return {
      configured: false,
      skipped: true,
      message: 'claude CLI not found; skipping Claude MCP registration.',
    };
  }

  spawnSync('claude', ['mcp', 'remove', 'onui-local', '--scope', 'user'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const add = spawnSync(
    'claude',
    ['mcp', 'add', '--scope', 'user', 'onui-local', '--', 'node', cliPath, 'mcp'],
    {
      stdio: 'pipe',
      encoding: 'utf8',
    }
  );

  if (add.status !== 0) {
    return {
      configured: false,
      skipped: false,
      message: `Failed to configure Claude MCP: ${add.stderr || add.stdout}`,
    };
  }

  return {
    configured: true,
    skipped: false,
    message: 'Claude MCP server configured as onui-local.',
  };
}
