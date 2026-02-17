import type { StoreRepository } from '../../store/repository.js';

interface DeleteAnnotationArgs {
  id: string;
}

export async function runDeleteAnnotationTool(
  repository: StoreRepository,
  args: DeleteAnnotationArgs
) {
  if (!args.id) {
    throw new Error('id is required');
  }

  return repository.deleteAnnotation(args.id);
}
