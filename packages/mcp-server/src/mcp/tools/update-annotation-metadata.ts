import type { StoreRepository } from '../../store/repository.js';

interface UpdateMetadataArgs {
  id: string;
  status?: 'pending' | 'acknowledged' | 'resolved' | 'dismissed' | undefined;
  intent?: 'fix' | 'change' | 'question' | 'approve' | undefined;
  severity?: 'blocking' | 'important' | 'suggestion' | undefined;
  comment?: string | undefined;
  expectedUpdatedAt?: number | undefined;
}

export async function runUpdateAnnotationMetadataTool(
  repository: StoreRepository,
  args: UpdateMetadataArgs
) {
  if (!args.id) {
    throw new Error('id is required');
  }

  return repository.updateAnnotationMetadata({
    id: args.id,
    patch: {
      ...(args.status ? { status: args.status } : {}),
      ...(args.intent ? { intent: args.intent } : {}),
      ...(args.severity ? { severity: args.severity } : {}),
      ...(args.comment !== undefined ? { comment: args.comment } : {}),
    },
    expectedUpdatedAt: args.expectedUpdatedAt,
  });
}
