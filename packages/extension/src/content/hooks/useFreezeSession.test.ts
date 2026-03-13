import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/preact';
import { useFreezeSession } from './useFreezeSession';

const mockCaptureViewport = vi.fn();
const mockMakePageInert = vi.fn();
const mockRestorePageInteractivity = vi.fn();

vi.mock('../messaging', () => ({
  captureViewport: () => mockCaptureViewport(),
}));

vi.mock('../utils/page-inert', () => ({
  makePageInert: () => mockMakePageInert(),
  restorePageInteractivity: () => mockRestorePageInteractivity(),
}));

describe('useFreezeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('activation', () => {
    it('starts inactive when enabled is false', () => {
      const { result } = renderHook(() => useFreezeSession({ enabled: false }));

      expect(result.current.isActive).toBe(false);
      expect(result.current.screenshot).toBeNull();
      expect(mockMakePageInert).not.toHaveBeenCalled();
      expect(mockCaptureViewport).not.toHaveBeenCalled();
    });

    it('activates freeze and captures viewport when enabled transitions to true', async () => {
      const viewportData = {
        dataUrl: 'data:image/png;base64,test',
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
      };
      mockCaptureViewport.mockResolvedValue({ success: true, data: viewportData });

      const { result, rerender } = renderHook(
        ({ enabled }) => useFreezeSession({ enabled }),
        { initialProps: { enabled: false } }
      );

      expect(result.current.isActive).toBe(false);

      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      expect(mockMakePageInert).toHaveBeenCalledTimes(1);
      expect(mockCaptureViewport).toHaveBeenCalledTimes(1);
      expect(result.current.screenshot).toEqual(viewportData);
    });

    it('deactivates freeze when enabled transitions to false', async () => {
      const viewportData = {
        dataUrl: 'data:image/png;base64,test',
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
      };
      mockCaptureViewport.mockResolvedValue({ success: true, data: viewportData });

      const { result, rerender } = renderHook(
        ({ enabled }) => useFreezeSession({ enabled }),
        { initialProps: { enabled: false } }
      );

      // First transition to enabled
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Then transition back to disabled
      rerender({ enabled: false });

      await waitFor(() => {
        expect(result.current.isActive).toBe(false);
      });

      expect(mockRestorePageInteractivity).toHaveBeenCalled();
      expect(result.current.screenshot).toBeNull();
    });
  });

  describe('capture failure handling', () => {
    it('restores interactivity when capture returns success false', async () => {
      mockCaptureViewport.mockResolvedValue({ success: false, error: 'Capture failed' });

      const { result, rerender } = renderHook(
        ({ enabled }) => useFreezeSession({ enabled }),
        { initialProps: { enabled: false } }
      );

      rerender({ enabled: true });

      await waitFor(() => {
        expect(mockRestorePageInteractivity).toHaveBeenCalled();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.screenshot).toBeNull();
    });

    it('restores interactivity when capture throws an error', async () => {
      mockCaptureViewport.mockRejectedValue(new Error('Network error'));

      const { result, rerender } = renderHook(
        ({ enabled }) => useFreezeSession({ enabled }),
        { initialProps: { enabled: false } }
      );

      rerender({ enabled: true });

      await waitFor(() => {
        expect(mockRestorePageInteractivity).toHaveBeenCalled();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.screenshot).toBeNull();
    });
  });

  describe('rect caching', () => {
    it('caches element rect and retrieves it via getFrozenRect', async () => {
      const viewportData = {
        dataUrl: 'data:image/png;base64,test',
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
      };
      mockCaptureViewport.mockResolvedValue({ success: true, data: viewportData });

      const { result, rerender } = renderHook(
        ({ enabled }) => useFreezeSession({ enabled }),
        { initialProps: { enabled: false } }
      );

      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      const mockElement = document.createElement('div');
      const mockRect = {
        top: 100,
        left: 200,
        bottom: 150,
        right: 300,
        width: 100,
        height: 50,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect;

      vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue(mockRect);

      act(() => {
        result.current.cacheElementRect(mockElement);
      });

      const cachedRect = result.current.getFrozenRect(mockElement);
      expect(cachedRect).toEqual(mockRect);
    });

    it('returns null for uncached elements', async () => {
      const viewportData = {
        dataUrl: 'data:image/png;base64,test',
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
      };
      mockCaptureViewport.mockResolvedValue({ success: true, data: viewportData });

      const { result, rerender } = renderHook(
        ({ enabled }) => useFreezeSession({ enabled }),
        { initialProps: { enabled: false } }
      );

      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      const uncachedElement = document.createElement('span');
      expect(result.current.getFrozenRect(uncachedElement)).toBeNull();
    });

    it('clears rect cache when deactivating', async () => {
      const viewportData = {
        dataUrl: 'data:image/png;base64,test',
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
      };
      mockCaptureViewport.mockResolvedValue({ success: true, data: viewportData });

      const { result, rerender } = renderHook(
        ({ enabled }) => useFreezeSession({ enabled }),
        { initialProps: { enabled: false } }
      );

      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      const mockElement = document.createElement('div');
      const mockRect = {
        top: 100,
        left: 200,
        bottom: 150,
        right: 300,
        width: 100,
        height: 50,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect;

      vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue(mockRect);

      act(() => {
        result.current.cacheElementRect(mockElement);
      });

      expect(result.current.getFrozenRect(mockElement)).toEqual(mockRect);

      // Deactivate
      rerender({ enabled: false });

      await waitFor(() => {
        expect(result.current.isActive).toBe(false);
      });

      // Cache should be cleared - element is no longer valid reference after rerender
      // but logically the cache was cleared
      expect(result.current.getFrozenRect(mockElement)).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('restores page interactivity on unmount when active', async () => {
      const viewportData = {
        dataUrl: 'data:image/png;base64,test',
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
      };
      mockCaptureViewport.mockResolvedValue({ success: true, data: viewportData });

      const { result, rerender, unmount } = renderHook(
        ({ enabled }) => useFreezeSession({ enabled }),
        { initialProps: { enabled: false } }
      );

      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      vi.clearAllMocks();

      unmount();

      expect(mockRestorePageInteractivity).toHaveBeenCalledTimes(1);
    });
  });
});
