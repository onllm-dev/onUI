import type { ViewportCapture } from '@/types';

interface FrozenOverlayProps {
  screenshot: ViewportCapture;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onClick?: (e: MouseEvent) => void;
}

/**
 * Full viewport overlay that displays a frozen screenshot.
 * Used during freeze mode to show a stable viewport while
 * allowing element selection without reflows.
 */
export function FrozenOverlay({ screenshot, onPointerMove, onPointerDown, onClick }: FrozenOverlayProps) {
  const { dataUrl, viewport } = screenshot;

  const style = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
    backgroundImage: `url(${dataUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'top left',
    backgroundRepeat: 'no-repeat',
    cursor: 'crosshair',
    touchAction: 'none',
    userSelect: 'none',
    // Below ElementHighlight (2147483646) but above page content
    zIndex: 2147483644,
    pointerEvents: 'auto',
  } as const;

  return (
    <div
      style={style}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onClick={onClick}
    />
  );
}
