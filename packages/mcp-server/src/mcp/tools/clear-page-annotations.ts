import type { StoreRepository } from '../../store/repository.js';

interface ClearPageAnnotationsArgs {
  pageUrl: string;
}

export async function runClearPageAnnotationsTool(
  repository: StoreRepository,
  args: ClearPageAnnotationsArgs
) {
  if (!args.pageUrl) {
    throw new Error('pageUrl is required');
  }

  return repository.clearPageAnnotations(args.pageUrl);
}
