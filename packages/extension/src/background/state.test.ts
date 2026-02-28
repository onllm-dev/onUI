import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('StateManager runtime state persistence', () => {
  const tabId = 42;
  let storageBucket: Record<string, unknown>;
  let storageSetMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    storageBucket = {};
    storageSetMock = vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(storageBucket, items);
    });

    const storageGetMock = vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
      if (typeof keys === 'string') {
        return { [keys]: storageBucket[keys] };
      }

      if (Array.isArray(keys)) {
        return keys.reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = storageBucket[key];
          return acc;
        }, {});
      }

      return storageBucket;
    });

    Object.defineProperty(globalThis, 'chrome', {
      value: {
        tabs: {
          onRemoved: {
            addListener: vi.fn(),
          },
        },
        storage: {
          session: {
            get: storageGetMock,
            set: storageSetMock,
          },
        },
      },
      configurable: true,
    });
  });

  it('restores enabled state after service worker restart', async () => {
    const { StateManager } = await import('./state');
    const firstWorkerManager = new StateManager();
    await firstWorkerManager.setTabEnabled(tabId, true);

    const restartedWorkerManager = new StateManager();
    const restored = await restartedWorkerManager.getTabRuntimeState(tabId);

    expect(restored.enabled).toBe(true);
  });

  it('persists runtime state updates to chrome.storage.session', async () => {
    const { StateManager } = await import('./state');
    const manager = new StateManager();
    await manager.setTabEnabled(tabId, true);

    expect(storageSetMock).toHaveBeenCalled();
  });

  it('serializes writes so stale snapshots cannot overwrite newer state', async () => {
    const pendingWrites: Array<{
      items: Record<string, unknown>;
      resolve: () => void;
    }> = [];

    storageSetMock.mockImplementation((items: Record<string, unknown>) => {
      const snapshot = JSON.parse(JSON.stringify(items)) as Record<string, unknown>;
      return new Promise<void>((resolve) => {
        pendingWrites.push({
          items: snapshot,
          resolve: () => {
            Object.assign(storageBucket, snapshot);
            resolve();
          },
        });
      });
    });

    const { StateManager } = await import('./state');
    const manager = new StateManager();

    const firstUpdate = manager.setTabEnabled(tabId, true);
    const secondUpdate = manager.setTabEnabled(tabId, false);

    await vi.waitFor(() => {
      expect(storageSetMock).toHaveBeenCalledTimes(1);
    });
    expect(storageSetMock).toHaveBeenCalledTimes(1);
    expect(pendingWrites).toHaveLength(1);

    const firstPendingWrite = pendingWrites[0];
    if (!firstPendingWrite) {
      throw new Error('Expected first pending write to exist');
    }
    firstPendingWrite.resolve();

    await vi.waitFor(() => {
      expect(storageSetMock).toHaveBeenCalledTimes(2);
    });
    expect(storageSetMock).toHaveBeenCalledTimes(2);
    expect(pendingWrites).toHaveLength(2);

    const secondPendingWrite = pendingWrites[1];
    if (!secondPendingWrite) {
      throw new Error('Expected second pending write to exist');
    }
    secondPendingWrite.resolve();
    await Promise.all([firstUpdate, secondUpdate]);

    const restartedWorkerManager = new StateManager();
    const restored = await restartedWorkerManager.getTabRuntimeState(tabId);
    expect(restored.enabled).toBe(false);
  });
});
