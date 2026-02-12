import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { isContextInvalidatedError } from '../messaging';

const LOG_PREFIX = '[onUI][useAnnotationMode]';

interface UseAnnotationModeReturn {
  isActive: boolean;
  isContextInvalid: boolean;
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
}

/**
 * Hook for managing annotation mode state
 * Syncs with background service worker for persistence
 */
export function useAnnotationMode(): UseAnnotationModeReturn {
  const [isActive, setIsActive] = useState(false);
  const [isContextInvalid, setIsContextInvalid] = useState(false);

  // Use refs to avoid recreating callbacks when state changes
  const isContextInvalidRef = useRef(isContextInvalid);
  isContextInvalidRef.current = isContextInvalid;

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const operationCounterRef = useRef(0);
  const latestUpdateSequenceRef = useRef(0);
  const nextOperationId = useCallback((name: string): string => {
    operationCounterRef.current += 1;
    return `${name}-${Date.now()}-${operationCounterRef.current}`;
  }, []);

  useEffect(() => {
    console.log(`${LOG_PREFIX} state`, {
      isActive,
      isContextInvalid,
    });
  }, [isActive, isContextInvalid]);

  // Sync state with background on mount
  // Note: Content scripts cannot use chrome.tabs API - background extracts tabId from sender
  useEffect(() => {
    const syncState = async () => {
      const operationId = nextOperationId('sync');
      const startedAt = Date.now();

      console.log(`${LOG_PREFIX} ${operationId} start`);

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_STATE',
          meta: {
            requestId: operationId,
            sentAt: startedAt,
            source: 'content',
          },
        });

        const durationMs = Date.now() - startedAt;
        console.log(`${LOG_PREFIX} ${operationId} response`, {
          durationMs,
          success: response?.success,
          isActive: response?.data?.isActive,
          error: response?.error,
        });

        if (response?.success) {
          setIsActive(response.data?.isActive ?? false);
        } else if (response?.error) {
          console.error(`${LOG_PREFIX} ${operationId} unsuccessful`, response.error);
        }
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        const contextInvalidated = isContextInvalidatedError(error);

        if (contextInvalidated) {
          setIsContextInvalid(true);
        }

        console.error(`${LOG_PREFIX} ${operationId} failed`, {
          durationMs,
          contextInvalidated,
          error: error instanceof Error ? error.message : error,
        });
      }
    };

    void syncState();
  }, [nextOperationId]);

  // Note: Content scripts cannot use chrome.tabs API - background extracts tabId from sender
  const updateState = useCallback(
    async (newState: boolean, source: 'toggle' | 'activate' | 'deactivate') => {
      const operationId = nextOperationId('updateState');

      if (isContextInvalidRef.current) {
        console.warn(`${LOG_PREFIX} ${operationId} skipped: context already invalid`, {
          source,
          newState,
        });
        return;
      }

      const previousState = isActiveRef.current;
      const startedAt = Date.now();
      latestUpdateSequenceRef.current += 1;
      const updateSequence = latestUpdateSequenceRef.current;

      console.log(`${LOG_PREFIX} ${operationId} start`, {
        source,
        previousState,
        newState,
        updateSequence,
      });

      setIsActive(newState);

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'SET_STATE',
          payload: { isActive: newState },
          meta: {
            requestId: operationId,
            sentAt: startedAt,
            source: 'content',
          },
        });

        const durationMs = Date.now() - startedAt;
        console.log(`${LOG_PREFIX} ${operationId} response`, {
          durationMs,
          success: response?.success,
          error: response?.error,
          updateSequence,
        });

        if (updateSequence !== latestUpdateSequenceRef.current) {
          console.log(`${LOG_PREFIX} ${operationId} stale response ignored`, {
            updateSequence,
            latestUpdateSequence: latestUpdateSequenceRef.current,
          });
          return;
        }

        if (!response?.success) {
          console.warn(`${LOG_PREFIX} ${operationId} reverting optimistic state`, {
            previousState,
            responseError: response?.error,
            updateSequence,
          });
          setIsActive(previousState);
        }
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        const contextInvalidated = isContextInvalidatedError(error);

        if (contextInvalidated) {
          setIsContextInvalid(true);
        }

        console.error(`${LOG_PREFIX} ${operationId} failed`, {
          durationMs,
          contextInvalidated,
          error: error instanceof Error ? error.message : error,
          updateSequence,
        });

        if (updateSequence !== latestUpdateSequenceRef.current) {
          console.log(`${LOG_PREFIX} ${operationId} stale failure ignored`, {
            updateSequence,
            latestUpdateSequence: latestUpdateSequenceRef.current,
          });
          return;
        }

        // Roll back optimistic update on failure
        setIsActive(previousState);
      }
    },
    [nextOperationId]
  );

  const activate = useCallback(() => {
    void updateState(true, 'activate');
  }, [updateState]);

  const deactivate = useCallback(() => {
    void updateState(false, 'deactivate');
  }, [updateState]);

  const toggle = useCallback(() => {
    const nextState = !isActiveRef.current;
    void updateState(nextState, 'toggle');
  }, [updateState]);

  return {
    isActive,
    isContextInvalid,
    activate,
    deactivate,
    toggle,
  };
}
