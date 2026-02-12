import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ensureStoreShape, type StoreSnapshot } from './schema.js';

async function withFileLock<T>(targetPath: string, fn: () => Promise<T>): Promise<T> {
  const lockPath = `${targetPath}.lock`;
  const lockDir = dirname(lockPath);
  await mkdir(lockDir, { recursive: true });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const handle = await open(lockPath, 'wx');
      await handle.close();
      try {
        return await fn();
      } finally {
        await rm(lockPath, { force: true });
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  throw new Error(`Failed to acquire file lock for ${targetPath}`);
}

export async function readStore(storePath: string): Promise<StoreSnapshot> {
  try {
    const raw = await readFile(storePath, 'utf8');
    return ensureStoreShape(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return ensureStoreShape(undefined);
    }

    throw error;
  }
}

export async function writeStore(storePath: string, store: StoreSnapshot): Promise<void> {
  await mkdir(dirname(storePath), { recursive: true });

  const tempPath = join(dirname(storePath), `.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  await writeFile(tempPath, JSON.stringify(store, null, 2), 'utf8');
  await rename(tempPath, storePath);
}

export async function withStore<T>(
  storePath: string,
  fn: (store: StoreSnapshot) => Promise<{ store: StoreSnapshot; result: T }> | { store: StoreSnapshot; result: T }
): Promise<T> {
  return withFileLock(storePath, async () => {
    const current = await readStore(storePath);
    const { store, result } = await fn(current);
    await writeStore(storePath, store);
    return result;
  });
}
