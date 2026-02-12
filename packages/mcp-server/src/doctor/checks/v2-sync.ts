import { readStore } from '../../store/io.js';
import { getStorePath } from '../../store/path.js';
import type { CheckResult } from '../types.js';

export async function checkV2SyncReadiness(): Promise<CheckResult> {
  const store = await readStore(getStorePath());

  return {
    name: 'v2.sync',
    status: 'ok',
    message: `Change log available with ${store.changeLog.length} entries for metadata pull sync.`,
  };
}
