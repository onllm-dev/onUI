import { access } from 'node:fs/promises';
import { getStorePath } from '../../store/path.js';
import { readStore, writeStore } from '../../store/io.js';
import type { CheckResult } from '../types.js';

export async function checkStoreHealth(): Promise<CheckResult> {
  const storePath = getStorePath();

  try {
    const store = await readStore(storePath);
    await writeStore(storePath, store);
    await access(storePath);

    return {
      name: 'store.health',
      status: 'ok',
      message: `Store is readable and writable at ${storePath}`,
      details: {
        pages: Object.keys(store.pages).length,
        annotations: Object.keys(store.annotationsById).length,
      },
    };
  } catch (error) {
    return {
      name: 'store.health',
      status: 'error',
      message: `Store check failed at ${storePath}: ${error instanceof Error ? error.message : 'unknown error'}`,
      fix: 'Verify filesystem permissions and rerun setup.',
    };
  }
}
