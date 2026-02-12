import { runDoctor } from '../doctor/index.js';
import { runMcpServer } from '../mcp/server.js';
import { runNativeHost } from '../native/host.js';
import { runSetup } from '../setup/index.js';

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'setup':
      await runSetup({ verbose: args.includes('--verbose') });
      return;
    case 'doctor': {
      const exitCode = await runDoctor({
        json: args.includes('--json'),
        deep: args.includes('--deep'),
      });
      process.exitCode = exitCode;
      return;
    }
    case 'mcp':
      await runMcpServer();
      return;
    case 'native-host':
      await runNativeHost();
      return;
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write('Usage: onui-mcp <setup|doctor|mcp|native-host> [options]\n');
      return;
    default:
      process.stderr.write(`Unknown command: ${command}\n`);
      process.exitCode = 1;
  }
}

void main();
