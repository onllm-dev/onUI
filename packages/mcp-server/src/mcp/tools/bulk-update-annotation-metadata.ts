import type { StoreRepository } from '../../store/repository.js';

interface BulkUpdateMetadataArgs {
  ids: string[];
  patch: {
    status?: 'pending' | 'acknowledged' | 'resolved' | 'dismissed' | undefined;
    intent?: 'fix' | 'change' | 'question' | 'approve' | undefined;
    severity?: 'blocking' | 'important' | 'suggestion' | undefined;
  };
}

export async function runBulkUpdateAnnotationMetadataTool(
  repository: StoreRepository,
  args: BulkUpdateMetadataArgs
) {
  if (!Array.isArray(args.ids) || args.ids.length === 0) {
    throw new Error('ids must be a non-empty array');
  }

  return repository.bulkUpdateAnnotationMetadata({
    ids: args.ids,
    patch: args.patch,
  });
}
