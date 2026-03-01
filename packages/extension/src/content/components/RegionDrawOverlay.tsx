import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RegionGeometry, RegionShape } from '@/types';
import { RegionOutline } from './RegionOutline';

interface RegionDrawOverlayProps {
  enabled: boolean;
  shape: RegionShape;
  cancelSignal?: number;
  onComplete: (geometry: RegionGeometry) => void;
  onDraftStateChange?: (isDrafting: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

interface DraftRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ActivePointer {
  id: number;
  target: EventTarget | null;
}

type DragEvent = PointerEvent | MouseEvent;

function normalizeDraft(start: Point, end: Point): DraftRegion {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
}

function isEditableNode(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const inputElement = target.closest('input, textarea, select, button');
  return inputElement !== null;
}

function getEventPointerId(event: DragEvent): number {
  return 'pointerId' in event && Number.isFinite(event.pointerId) ? event.pointerId : 1;
}

function toDocumentPoint(event: DragEvent): Point {
  const clientX = Number(event.clientX);
  const clientY = Number(event.clientY);

  return {
    x: (Number.isFinite(clientX) ? clientX : 0) + window.scrollX,
    y: (Number.isFinite(clientY) ? clientY : 0) + window.scrollY,
  };
}

export function RegionDrawOverlay({
  enabled,
  shape,
  cancelSignal,
  onComplete,
  onDraftStateChange,
}: RegionDrawOverlayProps) {
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [activePointer, setActivePointer] = useState<ActivePointer | null>(null);
  const activePointerRef = useRef<ActivePointer | null>(null);
  activePointerRef.current = activePointer;

  const resetDraft = useCallback(() => {
    const currentPointer = activePointerRef.current;
    if (
      currentPointer?.target instanceof Element &&
      typeof currentPointer.target.hasPointerCapture === 'function' &&
      typeof currentPointer.target.releasePointerCapture === 'function' &&
      currentPointer.target.hasPointerCapture(currentPointer.id)
    ) {
      currentPointer.target.releasePointerCapture(currentPointer.id);
    }

    setActivePointer(null);
    setDragStart(null);
    setDragCurrent(null);
    onDraftStateChange?.(false);
  }, [onDraftStateChange]);

  const supportsPointerEvents = typeof window.PointerEvent !== 'undefined';

  const draft = useMemo(() => {
    if (!dragStart || !dragCurrent) {
      return null;
    }

    return normalizeDraft(dragStart, dragCurrent);
  }, [dragStart, dragCurrent]);

  const handlePointerDown = useCallback((event: DragEvent) => {
    if (!enabled || activePointerRef.current !== null) {
      return;
    }

    if (isEditableNode(event.target)) {
      return;
    }

    const pointerId = getEventPointerId(event);
    const point = toDocumentPoint(event);

    if (event.currentTarget instanceof Element) {
      if ('setPointerCapture' in event.currentTarget && typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(pointerId);
      }

      setActivePointer({
        id: pointerId,
        target: event.currentTarget,
      });
    } else {
      setActivePointer({
        id: pointerId,
        target: null,
      });
    }

    setDragStart(point);
    setDragCurrent(point);
    onDraftStateChange?.(true);
  }, [enabled, onDraftStateChange]);

  const handlePointerMove = useCallback((event: DragEvent) => {
    const currentPointer = activePointerRef.current;
    const pointerId = getEventPointerId(event);
    if (!enabled || !dragStart || !currentPointer || pointerId !== currentPointer.id) {
      return;
    }

    setDragCurrent(toDocumentPoint(event));
  }, [enabled, dragStart]);

  const handlePointerUp = useCallback((event: DragEvent) => {
    const currentPointer = activePointerRef.current;
    const pointerId = getEventPointerId(event);
    if (!enabled || !dragStart || !currentPointer || pointerId !== currentPointer.id) {
      return;
    }

    const region = normalizeDraft(dragStart, toDocumentPoint(event));
    resetDraft();

    if (region.width < 6 || region.height < 6) {
      return;
    }

    onComplete({
      ...region,
      coordinateSpace: 'document',
    });
  }, [enabled, dragStart, onComplete, resetDraft]);

  useEffect(() => {
    if (!enabled) {
      resetDraft();
    }
  }, [enabled, resetDraft]);

  useEffect(() => {
    if (cancelSignal === undefined) {
      return;
    }

    resetDraft();
  }, [cancelSignal, resetDraft]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      class="onui-region-draw-overlay"
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
      }}
      onPointerDown={supportsPointerEvents ? handlePointerDown : undefined}
      onPointerMove={supportsPointerEvents ? handlePointerMove : undefined}
      onPointerUp={supportsPointerEvents ? handlePointerUp : undefined}
      onPointerCancel={supportsPointerEvents
        ? (event) => {
            const currentPointer = activePointerRef.current;
            if (currentPointer && getEventPointerId(event) === currentPointer.id) {
              resetDraft();
            }
          }
        : undefined}
      onMouseDown={!supportsPointerEvents ? handlePointerDown : undefined}
      onMouseMove={!supportsPointerEvents ? handlePointerMove : undefined}
      onMouseUp={!supportsPointerEvents ? handlePointerUp : undefined}
      onMouseLeave={!supportsPointerEvents ? handlePointerUp : undefined}
    >
      {draft && (
        <RegionOutline
          shape={shape}
          geometry={{
            x: draft.x,
            y: draft.y,
            width: draft.width,
            height: draft.height,
            coordinateSpace: 'document',
          }}
        />
      )}
    </div>
  );
}
