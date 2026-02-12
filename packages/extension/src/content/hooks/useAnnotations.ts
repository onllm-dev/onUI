import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import type { Annotation, AnnotationInput, AnnotationUpdate } from '@/types';
import {
  getAnnotations as fetchAnnotations,
  createAnnotation,
  updateAnnotation as updateAnnotationApi,
  deleteAnnotation as deleteAnnotationApi,
  clearAnnotations as clearAnnotationsApi,
  isContextInvalidatedError,
} from '../messaging';

const LOG_PREFIX = '[onUI][useAnnotations]';

interface UseAnnotationsReturn {
  annotations: Annotation[];
  isLoading: boolean;
  error: string | null;
  isContextInvalid: boolean;
  addAnnotation: (input: AnnotationInput) => Promise<Annotation | null>;
  updateAnnotation: (id: string, update: AnnotationUpdate) => Promise<boolean>;
  deleteAnnotation: (id: string) => Promise<boolean>;
  clearAnnotations: () => Promise<boolean>;
  refreshAnnotations: () => Promise<void>;
}

/**
 * Hook for managing annotations for the current page
 */
export function useAnnotations(): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContextInvalid, setIsContextInvalid] = useState(false);

  // Use refs to avoid recreating callbacks on state changes
  const isContextInvalidRef = useRef(isContextInvalid);
  isContextInvalidRef.current = isContextInvalid;

  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  const operationCounterRef = useRef(0);
  const nextOperationId = useCallback((name: string): string => {
    operationCounterRef.current += 1;
    return `${name}-${Date.now()}-${operationCounterRef.current}`;
  }, []);

  useEffect(() => {
    console.log(`${LOG_PREFIX} state`, {
      annotationsCount: annotations.length,
      isLoading,
      error,
      isContextInvalid,
    });
  }, [annotations.length, isLoading, error, isContextInvalid]);

  // Load annotations on mount
  const refreshAnnotations = useCallback(async () => {
    const operationId = nextOperationId('refresh');

    if (isContextInvalidRef.current) {
      console.warn(`${LOG_PREFIX} ${operationId} skipped: context already invalid`);
      return;
    }

    const startedAt = Date.now();
    console.log(`${LOG_PREFIX} ${operationId} start`, {
      url: window.location.href,
    });

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchAnnotations();
      console.log(`${LOG_PREFIX} ${operationId} response`, {
        success: response.success,
        count: response.data?.length,
        error: response.error,
      });

      if (response.success && response.data) {
        setAnnotations(response.data);
      } else {
        setError(response.error || 'Failed to load annotations');
      }
    } catch (err) {
      if (isContextInvalidatedError(err)) {
        setIsContextInvalid(true);
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`${LOG_PREFIX} ${operationId} failed`, {
        error: errorMessage,
        contextInvalidated: isContextInvalidatedError(err),
      });
      setError(errorMessage);
    } finally {
      const durationMs = Date.now() - startedAt;
      console.log(`${LOG_PREFIX} ${operationId} end`, { durationMs });
      setIsLoading(false);
    }
  }, [nextOperationId]);

  useEffect(() => {
    void refreshAnnotations();
  }, [refreshAnnotations]);

  // Add a new annotation
  const addAnnotation = useCallback(
    async (input: AnnotationInput): Promise<Annotation | null> => {
      const operationId = nextOperationId('add');

      if (isContextInvalidRef.current) {
        console.warn(`${LOG_PREFIX} ${operationId} skipped: context already invalid`);
        return null;
      }

      const startedAt = Date.now();
      console.log(`${LOG_PREFIX} ${operationId} start`, {
        selector: input.selector,
        pageUrl: input.pageUrl,
      });

      try {
        setError(null);

        const response = await createAnnotation(input);
        console.log(`${LOG_PREFIX} ${operationId} response`, {
          success: response.success,
          annotationId: response.data?.id,
          error: response.error,
        });

        if (response.success && response.data) {
          const newAnnotation = response.data;
          setAnnotations((prev) => [...prev, newAnnotation]);
          return newAnnotation;
        }

        setError(response.error || 'Failed to add annotation');
        return null;
      } catch (err) {
        if (isContextInvalidatedError(err)) {
          setIsContextInvalid(true);
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`${LOG_PREFIX} ${operationId} failed`, {
          error: errorMessage,
          contextInvalidated: isContextInvalidatedError(err),
        });
        setError(errorMessage);
        return null;
      } finally {
        const durationMs = Date.now() - startedAt;
        console.log(`${LOG_PREFIX} ${operationId} end`, { durationMs });
      }
    },
    [nextOperationId]
  );

  // Update an existing annotation
  const updateAnnotation = useCallback(
    async (id: string, update: AnnotationUpdate): Promise<boolean> => {
      const operationId = nextOperationId('update');

      if (isContextInvalidRef.current) {
        console.warn(`${LOG_PREFIX} ${operationId} skipped: context already invalid`, { id });
        return false;
      }

      const startedAt = Date.now();
      console.log(`${LOG_PREFIX} ${operationId} start`, { id, update });

      try {
        setError(null);

        const response = await updateAnnotationApi(id, update);
        console.log(`${LOG_PREFIX} ${operationId} response`, {
          success: response.success,
          error: response.error,
        });

        if (response.success && response.data) {
          const updatedAnnotation = response.data;
          setAnnotations((prev) =>
            prev.map((annotation) => (annotation.id === id ? updatedAnnotation : annotation))
          );
          return true;
        }

        setError(response.error || 'Failed to update annotation');
        return false;
      } catch (err) {
        if (isContextInvalidatedError(err)) {
          setIsContextInvalid(true);
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`${LOG_PREFIX} ${operationId} failed`, {
          error: errorMessage,
          contextInvalidated: isContextInvalidatedError(err),
        });
        setError(errorMessage);
        return false;
      } finally {
        const durationMs = Date.now() - startedAt;
        console.log(`${LOG_PREFIX} ${operationId} end`, { durationMs });
      }
    },
    [nextOperationId]
  );

  // Delete an annotation
  const deleteAnnotation = useCallback(
    async (id: string): Promise<boolean> => {
      const operationId = nextOperationId('delete');

      if (isContextInvalidRef.current) {
        console.warn(`${LOG_PREFIX} ${operationId} skipped: context already invalid`, { id });
        return false;
      }

      const startedAt = Date.now();
      console.log(`${LOG_PREFIX} ${operationId} start`, { id });

      try {
        setError(null);

        const response = await deleteAnnotationApi(id);
        console.log(`${LOG_PREFIX} ${operationId} response`, {
          success: response.success,
          error: response.error,
        });

        if (response.success) {
          setAnnotations((prev) => prev.filter((annotation) => annotation.id !== id));
          return true;
        }

        setError(response.error || 'Failed to delete annotation');
        return false;
      } catch (err) {
        if (isContextInvalidatedError(err)) {
          setIsContextInvalid(true);
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`${LOG_PREFIX} ${operationId} failed`, {
          error: errorMessage,
          contextInvalidated: isContextInvalidatedError(err),
        });
        setError(errorMessage);
        return false;
      } finally {
        const durationMs = Date.now() - startedAt;
        console.log(`${LOG_PREFIX} ${operationId} end`, { durationMs });
      }
    },
    [nextOperationId]
  );

  // Clear all annotations for current page in a single background operation
  const clearAnnotations = useCallback(async (): Promise<boolean> => {
    const operationId = nextOperationId('clear');

    if (isContextInvalidRef.current) {
      console.warn(`${LOG_PREFIX} ${operationId} skipped: context already invalid`);
      return false;
    }

    const startedAt = Date.now();
    const annotationCount = annotationsRef.current.length;

    console.log(`${LOG_PREFIX} ${operationId} start`, {
      url: window.location.href,
      annotationCount,
    });

    try {
      setError(null);

      const response = await clearAnnotationsApi();
      console.log(`${LOG_PREFIX} ${operationId} response`, {
        success: response.success,
        error: response.error,
      });

      if (response.success) {
        setAnnotations([]);
        return true;
      }

      setError(response.error || 'Failed to clear annotations');
      return false;
    } catch (err) {
      if (isContextInvalidatedError(err)) {
        setIsContextInvalid(true);
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`${LOG_PREFIX} ${operationId} failed`, {
        error: errorMessage,
        contextInvalidated: isContextInvalidatedError(err),
      });
      setError(errorMessage);
      return false;
    } finally {
      const durationMs = Date.now() - startedAt;
      console.log(`${LOG_PREFIX} ${operationId} end`, { durationMs });
    }
  }, [nextOperationId]);

  return {
    annotations,
    isLoading,
    error,
    isContextInvalid,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAnnotations,
    refreshAnnotations,
  };
}
