import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import type { AnnotationInput } from '@/types';
import { App } from './App';

const hookState = {
  annotateMode: false,
  toggleAnnotateMode: vi.fn(async () => {}),
};

const mockAddAnnotation = vi.fn<
  (input: AnnotationInput) =>
    Promise<
      | {
          id: string;
        }
      | null
    >
>();

vi.mock('../hooks/useTabRuntimeState', () => ({
  useTabRuntimeState: () => ({
    enabled: true,
    annotateMode: hookState.annotateMode,
    toggleAnnotateMode: hookState.toggleAnnotateMode,
    isContextInvalid: false,
  }),
}));

vi.mock('../hooks/useAnnotations', () => ({
  useAnnotations: () => ({
    annotations: [],
    addAnnotation: mockAddAnnotation,
    addAnnotationsBulk: vi.fn(async () => []),
    updateAnnotation: vi.fn(async () => true),
    deleteAnnotation: vi.fn(async () => true),
    clearAnnotations: vi.fn(async () => true),
    isContextInvalid: false,
  }),
}));

vi.mock('../messaging', () => ({
  getSettings: vi.fn(async () => ({ success: true, data: { clearOnCopy: true } })),
  updateSettings: vi.fn(async () => ({ success: true, data: { clearOnCopy: true } })),
  isToggleDrawModeMessage: () => false,
}));

vi.mock('@/shared/webext', () => ({
  webext: {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  },
}));

vi.mock('./ElementHighlight', () => ({
  ElementHighlight: () => null,
}));

vi.mock('./AnnotationMarkers', () => ({
  AnnotationMarkers: () => null,
}));

vi.mock('./RegionOutline', () => ({
  RegionOutline: () => null,
}));

vi.mock('./RegionTransformHandles', () => ({
  RegionTransformHandles: () => null,
}));

vi.mock('./OnUIDialog', () => ({
  OnUIDialog: () => null,
}));

vi.mock('./ErrorToast', () => ({
  ErrorToast: () => null,
}));

vi.mock('../hooks/useElementHover', () => ({
  useElementHover: () => ({
    hoveredElement: null,
  }),
}));

vi.mock('./RegionDrawOverlay', () => ({
  RegionDrawOverlay: ({ enabled, onComplete }: { enabled: boolean; onComplete: (geometry: any) => void }) => (
    <div>
      <div data-testid="region-overlay-enabled">{enabled ? 'on' : 'off'}</div>
      <button
        type="button"
        onClick={() =>
          onComplete({
            x: 100,
            y: 150,
            width: 80,
            height: 60,
            coordinateSpace: 'document',
          })
        }
      >
        Simulate draw complete
      </button>
    </div>
  ),
}));

vi.mock('./OnUIRegionDialog', () => ({
  OnUIRegionDialog: ({ onCancel, onSave }: { onCancel: () => void; onSave: (payload: { comment: string }) => void }) => (
    <div>
      <div>Region dialog mock</div>
      <button type="button" onClick={onCancel}>
        Cancel region dialog
      </button>
      <button type="button" onClick={() => onSave({ comment: 'Saved region' })}>
        Save region dialog
      </button>
    </div>
  ),
}));

describe('App draw mode lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.annotateMode = false;
    mockAddAnnotation.mockResolvedValue({ id: 'created-region-id' });
  });

  it('exits draw mode on region completion and allows one-click re-entry after cancel', async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle onUI panel' }));
    await user.click(screen.getByRole('button', { name: 'Toggle draw mode' }));
    expect(screen.getByTestId('region-overlay-enabled').textContent).toBe('on');

    await user.click(screen.getByText('Simulate draw complete'));
    expect(await screen.findByText('Region dialog mock')).toBeTruthy();
    expect(screen.getByTestId('region-overlay-enabled').textContent).toBe('off');

    await user.click(screen.getByText('Cancel region dialog'));
    await waitFor(() => {
      expect(screen.queryByText('Region dialog mock')).toBeNull();
    });

    await user.click(screen.getByRole('button', { name: 'Toggle onUI panel' }));
    await user.click(screen.getByRole('button', { name: 'Toggle draw mode' }));
    expect(screen.getByTestId('region-overlay-enabled').textContent).toBe('on');
  });

  it('keeps draw mode off after save and allows one-click re-entry', async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle onUI panel' }));
    await user.click(screen.getByRole('button', { name: 'Toggle draw mode' }));
    expect(screen.getByTestId('region-overlay-enabled').textContent).toBe('on');

    await user.click(screen.getByText('Simulate draw complete'));
    expect(await screen.findByText('Region dialog mock')).toBeTruthy();
    expect(screen.getByTestId('region-overlay-enabled').textContent).toBe('off');

    await user.click(screen.getByText('Save region dialog'));

    await waitFor(() => {
      expect(screen.queryByText('Region dialog mock')).toBeNull();
    });

    await user.click(screen.getByRole('button', { name: 'Toggle onUI panel' }));
    await user.click(screen.getByRole('button', { name: 'Toggle draw mode' }));
    expect(screen.getByTestId('region-overlay-enabled').textContent).toBe('on');
  });
});
