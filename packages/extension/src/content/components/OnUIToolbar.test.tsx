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

function renderToolbar({
  isAnnotateMode = false,
  multiSelectCount = 0,
  onToggleAnnotateMode = vi.fn(),
  annotations = [],
}: {
  isAnnotateMode?: boolean;
  multiSelectCount?: number;
  onToggleAnnotateMode?: () => void;
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
      onClearAnnotations={vi.fn()}
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
});
