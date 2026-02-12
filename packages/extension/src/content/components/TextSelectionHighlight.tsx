import { useMemo } from 'preact/hooks';
import { useViewportTick } from '../hooks/useViewportTick';

interface TextSelectionHighlightProps {
  rect: DOMRect;
}

/**
 * Visual highlight for selected text
 */
export function TextSelectionHighlight({ rect }: TextSelectionHighlightProps) {
  const tick = useViewportTick();
  const style = useMemo(() => ({
    position: 'absolute' as const,
    top: `${rect.top + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    background: 'rgba(99, 102, 241, 0.2)',
    border: '2px solid var(--onui-primary)',
    borderRadius: 'var(--onui-radius-sm)',
    pointerEvents: 'none' as const,
    zIndex: 2147483643,
    boxSizing: 'border-box' as const,
  }), [rect, tick]);

  return <div class="onui-text-selection-highlight" style={style} />;
}
