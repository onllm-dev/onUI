import type { StoreRepository } from '../../store/repository.js';

interface GetAnnotationsArgs {
  pageUrl: string;
  includeResolved?: boolean | undefined;
}

export async function runGetAnnotationsTool(repository: StoreRepository, args: GetAnnotationsArgs) {
  if (!args.pageUrl) {
    throw new Error('pageUrl is required');
  }

  return repository.getAnnotations(args.pageUrl, args.includeResolved ?? true);
}
