import { useMemo } from 'preact/hooks';
import type { Annotation } from '@/types';
import { AnnotationMarker } from './AnnotationMarker';
import { useViewportTick } from '../hooks/useViewportTick';
import { computeMarkerPlacements } from '../utils/marker-layout';

interface AnnotationMarkersProps {
  annotations: Annotation[];
  onMarkerClick: (annotation: Annotation) => void;
}

/**
 * Container for all annotation markers on the page
 */
export function AnnotationMarkers({
  annotations,
  onMarkerClick,
}: AnnotationMarkersProps) {
  const tick = useViewportTick();
  const placements = useMemo(() => computeMarkerPlacements(annotations), [annotations, tick]);

  if (annotations.length === 0) {
    return null;
  }

  return (
    <>
      {annotations.map((annotation, index) => (
        <AnnotationMarker
          key={annotation.id}
          annotation={annotation}
          index={index}
          placement={placements[index]}
          onClick={onMarkerClick}
        />
      ))}
    </>
  );
}
