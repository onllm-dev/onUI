import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import type { ViewportCapture, MessageResponse } from '@/types';
import { captureViewport } from '../messaging';
import { makePageInert, restorePageInteractivity } from '../utils/page-inert';

const LOG_PREFIX = '[onUI][useFreezeSession]';

export interface FreezeSession {
  isActive: boolean;
  screenshot: ViewportCapture | null;
  getFrozenRect: (element: Element) => DOMRect | null;
  cacheElementRect: (element: Element) => void;
}

interface UseFreezeSessionOptions {
  enabled: boolean;
}

/**
 * Hook for managing a freeze session that captures the viewport
 * and caches element positions for consistent overlay rendering.
 */
export function useFreezeSession(options: UseFreezeSessionOptions): FreezeSession {
  const { enabled } = options;

  const [isActive, setIsActive] = useState(false);
  const [screenshot, setScreenshot] = useState<ViewportCapture | null>(null);

  // Map to cache element DOMRects during freeze
  const rectCacheRef = useRef<Map<Element, DOMRect>>(new Map());

  // Track previous enabled state to detect transitions
  const prevEnabledRef = useRef(enabled);

  // Capture viewport and activate freeze session
  const activateFreeze = useCallback(async () => {
    console.log(`${LOG_PREFIX} activating freeze session`);

    try {
      // Make page inert first
      makePageInert();

      // Capture the viewport
      const response: MessageResponse<ViewportCapture> = await captureViewport();

      if (response.success && response.data) {
        console.log(`${LOG_PREFIX} viewport captured`, {
          width: response.data.viewport.width,
          height: response.data.viewport.height,
        });

        setScreenshot(response.data);
        setIsActive(true);
      } else {
        console.error(`${LOG_PREFIX} capture failed`, {
          error: response.error,
        });
        // Restore interactivity on failure
        restorePageInteractivity();
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} capture error`, {
        error: error instanceof Error ? error.message : error,
      });
      // Restore interactivity on error
      restorePageInteractivity();
    }
  }, []);

  // Deactivate freeze session and clear state
  const deactivateFreeze = useCallback(() => {
    console.log(`${LOG_PREFIX} deactivating freeze session`);

    restorePageInteractivity();
    rectCacheRef.current.clear();
    setScreenshot(null);
    setIsActive(false);
  }, []);

  // Handle enabled state changes
  useEffect(() => {
    const wasEnabled = prevEnabledRef.current;
    prevEnabledRef.current = enabled;

    if (enabled && !wasEnabled) {
      // Transitioning to enabled
      void activateFreeze();
    } else if (!enabled && wasEnabled) {
      // Transitioning to disabled
      deactivateFreeze();
    }
  }, [enabled, activateFreeze, deactivateFreeze]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevEnabledRef.current) {
        restorePageInteractivity();
      }
    };
  }, []);

  /**
   * Get the cached frozen rect for an element.
   * Returns null if the element hasn't been cached.
   */
  const getFrozenRect = useCallback((element: Element): DOMRect | null => {
    return rectCacheRef.current.get(element) ?? null;
  }, []);

  /**
   * Cache the current bounding rect of an element.
   * Should be called when selecting an element during freeze mode.
   */
  const cacheElementRect = useCallback((element: Element): void => {
    const rect = element.getBoundingClientRect();
    rectCacheRef.current.set(element, rect);
  }, []);

  return {
    isActive,
    screenshot,
    getFrozenRect,
    cacheElementRect,
  };
}
