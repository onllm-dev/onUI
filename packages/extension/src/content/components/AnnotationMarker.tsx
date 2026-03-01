import type { Annotation } from '@/types';
import type { MarkerPlacement } from '../utils/marker-layout';

interface AnnotationMarkerProps {
  annotation: Annotation;
  index: number;
  placement: MarkerPlacement | null | undefined;
  onClick: (annotation: Annotation) => void;
}

/**
 * Visual marker for an annotation on the page
 */
export function AnnotationMarker({
  annotation,
  index,
  placement,
  onClick,
}: AnnotationMarkerProps) {
  if (!placement) {
    return null;
  }

  const isRegion = annotation.targetType === 'region';
  const markerStyle = {
    position: placement.position,
    top: `${placement.top}px`,
    left: `${placement.left}px`,
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: isRegion
      ? 'var(--onui-marker-region-bg, #7c3aed)'
      : 'var(--onui-marker-bg, var(--onui-primary, #2563eb))',
    color: 'var(--onui-marker-text, #ffffff)',
    fontSize: '11px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    pointerEvents: 'auto',
    boxShadow: '0 0 0 1.5px rgba(0, 0, 0, 0.92), 0 0 0 3px rgba(255, 255, 255, 0.96), 0 8px 18px rgba(0, 0, 0, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.95)',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)',
    zIndex: 2147483644,
    transition: 'transform var(--onui-transition-fast)',
    fontFamily: 'var(--onui-font-family)',
  } as const;

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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(annotation);
        }
      }}
      title={annotation.comment}
      role="button"
      tabIndex={0}
      aria-label={`Annotation ${index + 1}: ${annotation.comment}`}
      data-target-type={annotation.targetType ?? 'element'}
    >
      {index + 1}
    </div>
  );
}
