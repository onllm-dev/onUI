import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/preact';
import { RegionTransformHandles } from './RegionTransformHandles';

describe('RegionTransformHandles', () => {
  it('renders move frame and eight resize handles', () => {
    const { container } = render(
      <RegionTransformHandles
        geometry={{ x: 60, y: 80, width: 100, height: 90, coordinateSpace: 'document' }}
        onChange={() => {}}
      />
    );

    expect(container.querySelector('.onui-region-transform')).toBeTruthy();
    const handles = container.querySelectorAll('.onui-region-handle');
    expect(handles).toHaveLength(8);
  });

  it('labels handles for directional resize affordance', () => {
    const { container } = render(
      <RegionTransformHandles
        geometry={{ x: 60, y: 80, width: 100, height: 90, coordinateSpace: 'document' }}
        onChange={() => {}}
      />
    );

    const labels = Array.from(container.querySelectorAll('.onui-region-handle'))
      .map((handle) => (handle as HTMLButtonElement).getAttribute('aria-label'))
      .filter((label): label is string => Boolean(label));

    expect(labels).toContain('Resize handle nw');
    expect(labels).toContain('Resize handle se');
    expect(labels).toContain('Resize handle n');
    expect(labels).toContain('Resize handle w');
  });
});
