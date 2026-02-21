import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { OnUIDialog } from './OnUIDialog';

describe('OnUIDialog', () => {
  beforeAll(() => {
    const cssApi = (globalThis as unknown as { CSS?: { escape?: (value: string) => string } }).CSS;
    if (!cssApi) {
      (globalThis as unknown as { CSS: { escape: (value: string) => string } }).CSS = {
        escape: (value: string) => value,
      };
      return;
    }

    if (typeof cssApi.escape !== 'function') {
      cssApi.escape = (value: string) => value;
    }
  });

  it('prevents duplicate saves while save is in flight', async () => {
    const user = userEvent.setup();
    const target = document.createElement('button');
    target.id = 'submit';
    document.body.appendChild(target);

    let resolveSave: (() => void) | undefined;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = () => resolve();
    });
    const onSave = vi.fn(() => savePromise);

    render(
      <OnUIDialog
        element={target}
        onSave={onSave}
        onCancel={() => {}}
      />
    );

    const textarea = screen.getByPlaceholderText('Describe the issue or feedback...');
    await user.type(textarea, 'Need to fix spacing');

    const addButton = screen.getByRole('button', { name: 'Add Annotation' });
    await user.click(addButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const savingButton = await screen.findByRole('button', { name: 'Saving...' });
    expect((savingButton as HTMLButtonElement).disabled).toBe(true);

    await user.click(savingButton);
    expect(onSave).toHaveBeenCalledTimes(1);

    if (!resolveSave) {
      throw new Error('Save resolver was not initialized');
    }
    resolveSave();

    await waitFor(() => {
      expect((screen.getByRole('button', { name: 'Add Annotation' }) as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
