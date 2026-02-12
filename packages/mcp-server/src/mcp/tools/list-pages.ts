import type { StoreRepository } from '../../store/repository.js';

interface ListPagesArgs {
  limit?: number | undefined;
  urlPrefix?: string | undefined;
}

export async function runListPagesTool(repository: StoreRepository, args: ListPagesArgs) {
  return repository.listPages({
    limit: args.limit,
    urlPrefix: args.urlPrefix,
  });
}
