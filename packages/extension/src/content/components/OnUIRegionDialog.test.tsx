import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { OnUIRegionDialog } from './OnUIRegionDialog';

describe('OnUIRegionDialog', () => {
  it('closes when the dialog close button is clicked', async () => {
    const onCancel = vi.fn();

    const { container } = render(
      <OnUIRegionDialog
        geometry={{ x: 100, y: 120, width: 140, height: 90, coordinateSpace: 'document' }}
        shape="rectangle"
        onSave={() => {}}
        onCancel={onCancel}
      />
    );

    const dialog = container.querySelector('.onui-dialog.onui-region-dialog');
    expect(dialog).toBeTruthy();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('saves on Ctrl+Enter when comment is present', async () => {
    const onSave = vi.fn();

    render(
      <OnUIRegionDialog
        geometry={{ x: 100, y: 120, width: 140, height: 90, coordinateSpace: 'document' }}
        shape="ellipse"
        onSave={onSave}
        onCancel={() => {}}
      />
    );

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('What should change here?'), 'Increase spacing');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onSave).toHaveBeenCalledWith({ comment: 'Increase spacing' });
  });
});
