import { useMemo } from 'preact/hooks';
import type { Annotation } from '@/types';

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
      const doc = document.documentElement;
      const pageWidth = Math.max(doc.scrollWidth, doc.clientWidth);
      const pageHeight = Math.max(doc.scrollHeight, doc.clientHeight);
      const maxTop = pageHeight - markerSize - pagePadding;
      const maxLeft = pageWidth - markerSize - pagePadding;
      top = clamp(rawTop, pagePadding, maxTop);
      left = clamp(rawLeft, pagePadding, maxLeft);
    }

    return {
      position: (boundingBox.isFixed ? 'fixed' : 'absolute') as const,
      top: `${top}px`,
      left: `${left}px`,
      width: `${markerSize}px`,
      height: `${markerSize}px`,
      borderRadius: '50%',
      background: 'var(--onui-primary)',
      color: 'white',
      fontSize: '11px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: 'var(--onui-shadow)',
      border: '2px solid white',
      zIndex: 2147483644,
      transition: 'transform var(--onui-transition-fast)',
      fontFamily: 'var(--onui-font-family)',
    };
  }, [boundingBox]);

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
