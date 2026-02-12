import type { OutputLevel } from '@onui/core';
import type { StoreRepository } from '../../store/repository.js';

interface GetReportArgs {
  pageUrl: string;
  level?: OutputLevel | undefined;
}

export async function runGetReportTool(repository: StoreRepository, args: GetReportArgs) {
  if (!args.pageUrl) {
    throw new Error('pageUrl is required');
  }

  return repository.getReport(args.pageUrl, args.level ?? 'standard');
}
