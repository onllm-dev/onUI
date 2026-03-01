import type { Annotation, RegionGeometry, RegionShape } from '@/types';
import { useViewportTick } from '../hooks/useViewportTick';

type RegionOutlineProps =
  | {
      annotation: Annotation;
      selected?: boolean;
    }
  | {
      shape: RegionShape;
      geometry: RegionGeometry;
      selected?: boolean;
    };

function getRegionStyle(shape: RegionShape, selected: boolean) {
  const borderColor = selected ? 'rgba(249, 115, 22, 0.95)' : 'rgba(91, 99, 255, 0.85)';
  const backgroundColor = selected ? 'rgba(249, 115, 22, 0.16)' : 'rgba(91, 99, 255, 0.1)';

  return {
    border: `1.5px solid ${borderColor}`,
    backgroundColor,
    borderRadius: shape === 'ellipse' ? '9999px' : '6px',
    boxShadow: selected ? '0 0 0 1px rgba(255,255,255,0.65), 0 8px 18px rgba(0,0,0,0.35)' : 'none',
  };
}

function hasRegionGeometry(annotation: Annotation): annotation is Annotation & {
  targetType: 'region';
  region: { shape: RegionShape; geometry: RegionGeometry };
} {
  return annotation.targetType === 'region' && annotation.region !== undefined;
}

export function RegionOutline(props: RegionOutlineProps) {
  const selected = props.selected ?? false;

  useViewportTick();

  const region = (() => {
    if ('annotation' in props) {
      if (!hasRegionGeometry(props.annotation)) {
        return null;
      }

      return props.annotation.region;
    }

    return {
      shape: props.shape,
      geometry: props.geometry,
    };
  })();

  if (!region) {
    return null;
  }

  const style = getRegionStyle(region.shape, selected);

  return (
    <div
      class={`onui-region-outline ${selected ? 'selected' : ''}`}
      style={{
        position: 'fixed',
        top: `${region.geometry.y - window.scrollY}px`,
        left: `${region.geometry.x - window.scrollX}px`,
        width: `${region.geometry.width}px`,
        height: `${region.geometry.height}px`,
        pointerEvents: 'none',
        zIndex: 2147483643,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
