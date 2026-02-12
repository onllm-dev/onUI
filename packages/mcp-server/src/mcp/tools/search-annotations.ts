import type { StoreRepository } from '../../store/repository.js';

interface SearchAnnotationsArgs {
  query: string;
  pageUrl?: string | undefined;
  status?: string | undefined;
  severity?: string | undefined;
  intent?: string | undefined;
  limit?: number | undefined;
}

export async function runSearchAnnotationsTool(repository: StoreRepository, args: SearchAnnotationsArgs) {
  const query = args.query.trim();
  if (!query) {
    throw new Error('query is required');
  }

  return repository.searchAnnotations({
    ...args,
    query,
  });
}
