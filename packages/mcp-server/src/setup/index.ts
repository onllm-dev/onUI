import { configureClaudeMcp } from './configure-claude.js';
import { configureCodexMcp } from './configure-codex.js';
import { installNativeHost } from './install-native-host.js';

export interface SetupOptions {
  verbose?: boolean;
  cliPath?: string | undefined;
}

export async function runSetup(options: SetupOptions = {}): Promise<void> {
  const cliPath = options.cliPath ?? process.argv[1];
  if (!cliPath) {
    throw new Error('Unable to detect CLI path for setup.');
  }

  const nativeHost = await installNativeHost(cliPath);
  const claude = configureClaudeMcp(cliPath);
  const codex = configureCodexMcp(cliPath);

  process.stdout.write('onui setup completed.\n');
  process.stdout.write(`- Native host: ${nativeHost.hostName}\n`);
  process.stdout.write(`- Native manifest: ${nativeHost.manifestPath}\n`);
  process.stdout.write(`- Native wrapper: ${nativeHost.wrapperPath}\n`);
  process.stdout.write(`- Node binary: ${nativeHost.nodeBinary}\n`);
  process.stdout.write(`- Claude: ${claude.message}\n`);
  process.stdout.write(`- Codex: ${codex.message}\n`);

  if (options.verbose) {
    process.stdout.write('\nRollback commands:\n');
    process.stdout.write('- claude mcp remove onui-local --scope user\n');
    process.stdout.write('- codex mcp remove onui-local\n');
  }
}
