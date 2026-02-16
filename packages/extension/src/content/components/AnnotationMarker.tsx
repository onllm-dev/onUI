import { useMemo } from 'preact/hooks';
import type { Annotation } from '@/types';
import { useViewportTick } from '../hooks/useViewportTick';

interface AnnotationMarkerProps {
  annotation: Annotation;
  index: number;
  onClick: (annotation: Annotation) => void;
}

/**
 * Visual marker for an annotation on the page
 */
export function AnnotationMarker({
  annotation,
  index,
  onClick,
}: AnnotationMarkerProps) {
  const tick = useViewportTick();
  const { boundingBox } = annotation;

  // Memoize style calculation to avoid recalculating on every render
  const markerStyle = useMemo(() => {
    if (!boundingBox) {
      return null;
    }

    const markerSize = 20;
    const markerEdgeOffset = 8;
    const pagePadding = 4;

    const clamp = (value: number, min: number, max: number): number => {
      if (max < min) {
        return min;
      }
      return Math.min(Math.max(value, min), max);
    };

    const rawTop = boundingBox.top - markerEdgeOffset;
    const rawLeft = boundingBox.left + boundingBox.width - markerEdgeOffset;

    let top = rawTop;
    let left = rawLeft;

    if (boundingBox.isFixed) {
      const maxTop = window.innerHeight - markerSize - pagePadding;
      const maxLeft = window.innerWidth - markerSize - pagePadding;
      top = clamp(rawTop, pagePadding, maxTop);
      left = clamp(rawLeft, pagePadding, maxLeft);
    } else {
      // Keep markers visible in the current viewport for page-level elements.
      const minTop = window.scrollY + pagePadding;
      const minLeft = window.scrollX + pagePadding;
      const maxTop = window.scrollY + window.innerHeight - markerSize - pagePadding;
      const maxLeft = window.scrollX + window.innerWidth - markerSize - pagePadding;
      top = clamp(rawTop, minTop, maxTop);
      left = clamp(rawLeft, minLeft, maxLeft);
    }

    return {
      position: (boundingBox.isFixed ? 'fixed' : 'absolute') as const,
      top: `${top}px`,
      left: `${left}px`,
      width: `${markerSize}px`,
      height: `${markerSize}px`,
      borderRadius: '50%',
      background: 'var(--onui-marker-bg, var(--onui-primary, #2563eb))',
      color: 'var(--onui-marker-text, #ffffff)',
      fontSize: '11px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 0 0 1.5px rgba(0, 0, 0, 0.92), 0 0 0 3px rgba(255, 255, 255, 0.96), 0 8px 18px rgba(0, 0, 0, 0.45)',
      border: '1px solid rgba(255, 255, 255, 0.95)',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)',
      zIndex: 2147483644,
      transition: 'transform var(--onui-transition-fast)',
      fontFamily: 'var(--onui-font-family)',
    };
  }, [boundingBox, tick]);

  if (!markerStyle) {
    return null;
  }

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(annotation);
  };

  return (
    <div
      class="onui-marker"
      style={markerStyle}
      onClick={handleClick}
      title={annotation.comment}
    >
      {index + 1}
    </div>
  );
}
