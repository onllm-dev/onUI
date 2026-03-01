import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RegionGeometry } from '@/types';

interface RegionTransformHandlesProps {
  geometry: RegionGeometry;
  onChange: (geometry: RegionGeometry) => void;
}

type HandleType =
  | 'move'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

interface TransformState {
  handle: HandleType;
  startPointerX: number;
  startPointerY: number;
  startGeometry: RegionGeometry;
}

const MIN_SIZE = 20;

function clampSize(value: number): number {
  return Math.max(MIN_SIZE, value);
}

function computeNextGeometry(state: TransformState, pointerX: number, pointerY: number): RegionGeometry {
  const dx = pointerX - state.startPointerX;
  const dy = pointerY - state.startPointerY;
  const next = { ...state.startGeometry };

  if (state.handle === 'move') {
    next.x = state.startGeometry.x + dx;
    next.y = state.startGeometry.y + dy;
    return next;
  }

  if (state.handle.includes('e')) {
    next.width = clampSize(state.startGeometry.width + dx);
  }

  if (state.handle.includes('s')) {
    next.height = clampSize(state.startGeometry.height + dy);
  }

  if (state.handle.includes('w')) {
    const rawWidth = state.startGeometry.width - dx;
    next.width = clampSize(rawWidth);
    next.x = state.startGeometry.x + (state.startGeometry.width - next.width);
  }

  if (state.handle.includes('n')) {
    const rawHeight = state.startGeometry.height - dy;
    next.height = clampSize(rawHeight);
    next.y = state.startGeometry.y + (state.startGeometry.height - next.height);
  }

  return next;
}

function getHandleStyle(geometry: RegionGeometry, handle: HandleType) {
  const half = 5;
  const centerX = geometry.width / 2;
  const centerY = geometry.height / 2;

  const map: Record<Exclude<HandleType, 'move'>, { left: number; top: number; cursor: string }> = {
    nw: { left: 0, top: 0, cursor: 'nwse-resize' },
    n: { left: centerX, top: 0, cursor: 'ns-resize' },
    ne: { left: geometry.width, top: 0, cursor: 'nesw-resize' },
    e: { left: geometry.width, top: centerY, cursor: 'ew-resize' },
    se: { left: geometry.width, top: geometry.height, cursor: 'nwse-resize' },
    s: { left: centerX, top: geometry.height, cursor: 'ns-resize' },
    sw: { left: 0, top: geometry.height, cursor: 'nesw-resize' },
    w: { left: 0, top: centerY, cursor: 'ew-resize' },
  };

  const position = map[handle as Exclude<HandleType, 'move'>];

  return {
    position: 'absolute',
    left: `${position.left - half}px`,
    top: `${position.top - half}px`,
    width: '10px',
    height: '10px',
    borderRadius: '9999px',
    border: '1px solid rgba(255,255,255,0.95)',
    background: 'rgba(91,99,255,0.95)',
    cursor: position.cursor,
  } as const;
}

const HANDLE_ORDER: Array<Exclude<HandleType, 'move'>> = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function RegionTransformHandles({ geometry, onChange }: RegionTransformHandlesProps) {
  const [active, setActive] = useState<TransformState | null>(null);
  const activeRef = useRef<TransformState | null>(active);
  activeRef.current = active;

  const handles = useMemo(() => HANDLE_ORDER.map((handle) => ({
    handle,
    style: getHandleStyle(geometry, handle),
  })), [geometry]);

  const startTransform = useCallback((event: PointerEvent, handle: HandleType) => {
    event.preventDefault();
    event.stopPropagation();

    setActive({
      handle,
      startPointerX: event.clientX + window.scrollX,
      startPointerY: event.clientY + window.scrollY,
      startGeometry: geometry,
    });
  }, [geometry]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const current = activeRef.current;
      if (!current) {
        return;
      }

      const pointerX = event.clientX + window.scrollX;
      const pointerY = event.clientY + window.scrollY;
      onChange(computeNextGeometry(current, pointerX, pointerY));
    };

    const onPointerUp = () => {
      if (!activeRef.current) {
        return;
      }

      setActive(null);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);

    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, [onChange]);

  return (
    <div
      class="onui-region-transform"
      style={{
        position: 'fixed',
        top: `${geometry.y - window.scrollY}px`,
        left: `${geometry.x - window.scrollX}px`,
        width: `${geometry.width}px`,
        height: `${geometry.height}px`,
        border: '1px dashed rgba(91,99,255,0.85)',
        zIndex: 2147483644,
        pointerEvents: 'auto',
      }}
      onPointerDown={(event) => startTransform(event, 'move')}
    >
      {handles.map(({ handle, style }) => (
        <button
          key={handle}
          type="button"
          class="onui-region-handle"
          style={style}
          onPointerDown={(event) => startTransform(event, handle)}
          aria-label={`Resize handle ${handle}`}
        />
      ))}
    </div>
  );
}
