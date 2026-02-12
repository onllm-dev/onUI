import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CheckResult } from '../types.js';

export async function checkMcpRuntime(cliPath: string): Promise<CheckResult> {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [cliPath, 'mcp'],
    stderr: 'pipe',
  });

  const client = new Client(
    {
      name: 'onui-doctor',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    await client.close();

    return {
      name: 'mcp.runtime',
      status: 'ok',
      message: `MCP runtime started and returned ${tools.tools.length} tools.`,
    };
  } catch (error) {
    await client.close().catch(() => undefined);
    return {
      name: 'mcp.runtime',
      status: 'error',
      message: `MCP runtime check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      fix: 'Rebuild package and rerun setup.',
    };
  }
}
