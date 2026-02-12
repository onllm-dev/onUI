import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyStore } from './schema.js';
import { readStore, withStore } from './io.js';

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe('store io', () => {
  it('reads/writes through lock wrapper', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'onui-store-test-'));
    tempDirs.push(dir);
    const storePath = join(dir, 'store.v1.json');

    await withStore(storePath, (store) => {
      const seeded = {
        ...createEmptyStore(),
        ...store,
      };

      return {
        store: {
          ...seeded,
          updatedAt: 42,
        },
        result: 42,
      };
    });

    const reloaded = await readStore(storePath);
    expect(reloaded.updatedAt).toBe(42);
  });
});
