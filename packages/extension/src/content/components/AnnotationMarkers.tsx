import type { Annotation } from '@/types';
import { AnnotationMarker } from './AnnotationMarker';

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
          onClick={onMarkerClick}
        />
      ))}
    </>
  );
}
