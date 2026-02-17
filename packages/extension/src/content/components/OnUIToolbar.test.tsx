import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import type { Annotation } from '@/types';
import { OnUIToolbar } from './OnUIToolbar';

vi.mock('../utils/clipboard', () => ({
  copyToClipboard: vi.fn(async () => true),
}));

vi.mock('../utils/output-generation', () => ({
  generateOutput: vi.fn(() => 'copied annotation output'),
}));

function createAnnotation(id: string): Annotation {
  return {
    id,
    selector: `#annotation-${id}`,
    elementPath: `div > #annotation-${id}`,
    tagName: 'div',
    comment: `Annotation ${id}`,
    boundingBox: {
      top: 0,
      left: 0,
      width: 100,
      height: 20,
      isFixed: false,
    },
    createdAt: 1,
    updatedAt: 1,
    pageUrl: 'https://example.com',
    pageTitle: 'Example',
    attributes: {},
  };
}

function renderToolbar({
  isAnnotateMode = false,
  multiSelectCount = 0,
  onToggleAnnotateMode = vi.fn(),
  clearOnCopy = false,
  onClearOnCopyChange = vi.fn(),
  onClearAnnotations = vi.fn(),
  annotations = [],
}: {
  isAnnotateMode?: boolean;
  multiSelectCount?: number;
  onToggleAnnotateMode?: () => void;
  clearOnCopy?: boolean;
  onClearOnCopyChange?: (enabled: boolean) => void;
  onClearAnnotations?: () => void | Promise<void>;
  annotations?: Annotation[];
} = {}) {
  render(
    <OnUIToolbar
      isAnnotateMode={isAnnotateMode}
      multiSelectCount={multiSelectCount}
      onToggleAnnotateMode={onToggleAnnotateMode}
      annotations={annotations}
      outputLevel="standard"
      onOutputLevelChange={vi.fn()}
      clearOnCopy={clearOnCopy}
      onClearOnCopyChange={onClearOnCopyChange}
      onClearAnnotations={onClearAnnotations}
    />
  );
}

describe('OnUIToolbar', () => {
  it('shows Shift multi-select guidance when annotate mode is active', async () => {
    renderToolbar({ isAnnotateMode: true, multiSelectCount: 0 });
    const user = userEvent.setup();

    await user.click(screen.getByTitle('Toggle onUI panel'));

    expect(screen.getByText('Tip: hold Shift and click to multi-select elements.')).toBeTruthy();
  });

  it('shows selected count guidance while multi-select is in progress', async () => {
    renderToolbar({ isAnnotateMode: true, multiSelectCount: 3 });
    const user = userEvent.setup();

    await user.click(screen.getByTitle('Toggle onUI panel'));

    expect(screen.getByText('Shift multi-select: 3 selected. Release Shift to annotate all.')).toBeTruthy();
  });

  it('does not show Shift guidance when annotate mode is off', async () => {
    renderToolbar({ isAnnotateMode: false, multiSelectCount: 4 });
    const user = userEvent.setup();

    await user.click(screen.getByTitle('Toggle onUI panel'));

    expect(screen.queryByText('Tip: hold Shift and click to multi-select elements.')).toBeNull();
    expect(screen.queryByText('Shift multi-select: 4 selected. Release Shift to annotate all.')).toBeNull();
  });

  it('exits annotate mode on Escape', async () => {
    const onToggleAnnotateMode = vi.fn();
    renderToolbar({ isAnnotateMode: true, onToggleAnnotateMode });
    const user = userEvent.setup();

    await user.keyboard('{Escape}');

    expect(onToggleAnnotateMode).toHaveBeenCalledTimes(1);
  });

  it('clears annotations after successful copy when clear-on-copy is enabled', async () => {
    const onClearAnnotations = vi.fn();
    renderToolbar({
      clearOnCopy: true,
      onClearAnnotations,
      annotations: [createAnnotation('1')],
    });
    const user = userEvent.setup();

    await user.click(screen.getByTitle('Toggle onUI panel'));
    await user.click(screen.getByText('Copy'));

    expect(onClearAnnotations).toHaveBeenCalledTimes(1);
  });

  it('updates clear-on-copy setting from settings panel checkbox', async () => {
    const onClearOnCopyChange = vi.fn();
    renderToolbar({ onClearOnCopyChange });
    const user = userEvent.setup();

    await user.click(screen.getByTitle('Toggle onUI panel'));
    await user.click(screen.getByText('Settings'));
    await user.click(screen.getByLabelText('Clear On Copy'));

    expect(onClearOnCopyChange).toHaveBeenCalledWith(true);
  });
});
