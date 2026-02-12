export interface SetupOptions {
  verbose?: boolean;
}

export async function runSetup(_options: SetupOptions = {}): Promise<void> {
  // Full setup implementation lives in dedicated modules added in subsequent commits.
  process.stdout.write('onui setup: setup steps will be configured by installer modules.\n');
}
