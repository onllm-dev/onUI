import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { App } from './App';

const runtimeState = vi.hoisted(() => ({
  annotateMode: false,
}));

const mockCaptureViewport = vi.hoisted(() => vi.fn());
const mockMakePageInert = vi.hoisted(() => vi.fn());
const mockRestorePageInteractivity = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useTabRuntimeState', async () => {
  const hooks = await vi.importActual<typeof import('preact/hooks')>('preact/hooks');

  return {
    useTabRuntimeState: () => {
      const [annotateMode, setAnnotateModeState] = hooks.useState(runtimeState.annotateMode);

      hooks.useEffect(() => {
        runtimeState.annotateMode = annotateMode;
      }, [annotateMode]);

      return {
        enabled: true,
        annotateMode,
        isContextInvalid: false,
        setEnabled: vi.fn(async () => {}),
        setAnnotateMode: vi.fn(async (nextAnnotateMode: boolean) => {
          runtimeState.annotateMode = nextAnnotateMode;
          setAnnotateModeState(nextAnnotateMode);
        }),
        toggleEnabled: vi.fn(async () => {}),
        toggleAnnotateMode: vi.fn(async () => {
          setAnnotateModeState((previous) => {
            const next = !previous;
            runtimeState.annotateMode = next;
            return next;
          });
        }),
      };
    },
  };
});

vi.mock('../hooks/useAnnotations', () => ({
  useAnnotations: () => ({
    annotations: [],
    addAnnotation: vi.fn(async () => ({ id: 'created-id' })),
    addAnnotationsBulk: vi.fn(async () => []),
    updateAnnotation: vi.fn(async () => true),
    deleteAnnotation: vi.fn(async () => true),
    clearAnnotations: vi.fn(async () => true),
    refreshAnnotations: vi.fn(async () => {}),
    isLoading: false,
    error: null,
    isContextInvalid: false,
  }),
}));

vi.mock('../messaging', () => ({
  getSettings: vi.fn(async () => ({ success: true, data: { clearOnCopy: true } })),
  updateSettings: vi.fn(async () => ({ success: true, data: { clearOnCopy: true } })),
  captureViewport: () => mockCaptureViewport(),
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

vi.mock('../utils/page-inert', () => ({
  makePageInert: () => mockMakePageInert(),
  restorePageInteractivity: () => mockRestorePageInteractivity(),
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
  OnUIDialog: ({ onCancel }: { onCancel: () => void }) => (
    <div>
      <div>Annotation dialog mock</div>
      <button type="button" onClick={onCancel}>
        Cancel annotation dialog
      </button>
    </div>
  ),
}));

vi.mock('./OnUIRegionDialog', () => ({
  OnUIRegionDialog: () => null,
}));

vi.mock('./RegionDrawOverlay', () => ({
  RegionDrawOverlay: () => null,
}));

vi.mock('./ErrorToast', () => ({
  ErrorToast: () => null,
}));

function installPointerEventShim() {
  if (typeof window.PointerEvent === 'function') {
    return;
  }

  class PointerEventShim extends MouseEvent {}

  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: PointerEventShim,
  });
}

function installElementsFromPointMock() {
  const elementsFromPoint = vi.fn(() => [] as Element[]);
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    writable: true,
    value: elementsFromPoint,
  });
  return elementsFromPoint;
}

function installHostDismissListener(type: 'pointerdown' | 'keydown') {
  const hostDismiss = vi.fn();
  document.addEventListener(type, hostDismiss);

  return {
    hostDismiss,
    cleanup: () => document.removeEventListener(type, hostDismiss),
  };
}

function renderInOnUiHost() {
  document.body.innerHTML = '';

  const host = document.createElement('div');
  host.id = 'onui-shadow-host';

  const appContainer = document.createElement('div');
  host.appendChild(appContainer);
  document.body.appendChild(host);

  const modal = document.createElement('div');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Host dialog');
  document.body.appendChild(modal);

  render(<App />, { container: appContainer });

  return { host, modal };
}

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

function dispatchPointerDown(target: Element, coords = { clientX: 24, clientY: 24 }) {
  target.dispatchEvent(
    new window.PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ...coords,
    })
  );
}

describe('App lean freeze/session coverage', () => {
  beforeAll(() => {
    installPointerEventShim();
  });

  beforeEach(() => {
    runtimeState.annotateMode = false;
    vi.clearAllMocks();
    installElementsFromPointMock();

    mockCaptureViewport.mockResolvedValue({
      success: true,
      data: {
        dataUrl: 'data:image/png;base64,test-screenshot',
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
      },
    });
  });

  it('enters annotate mode and starts freeze capture', async () => {
    renderInOnUiHost();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle onUI panel' }));
    await user.click(screen.getByRole('button', { name: 'Toggle annotate mode' }));

    await waitFor(() => {
      expect(mockCaptureViewport).toHaveBeenCalledTimes(1);
    });
  });

  it('selects in annotate mode without triggering host pointer dismissal', async () => {
    runtimeState.annotateMode = true;
    const elementsFromPoint = installElementsFromPointMock();
    const { modal } = renderInOnUiHost();
    const { hostDismiss, cleanup } = installHostDismissListener('pointerdown');

    const target = document.createElement('button');
    target.textContent = 'Dialog action';
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 20,
        left: 20,
        bottom: 60,
        right: 180,
        width: 160,
        height: 40,
        x: 20,
        y: 20,
        toJSON: () => ({}),
      }),
    });

    modal.appendChild(target);
    elementsFromPoint.mockReturnValue([target]);
    await flushEffects();

    dispatchPointerDown(target);

    expect(hostDismiss).not.toHaveBeenCalled();
    expect(await screen.findByText('Annotation dialog mock')).toBeTruthy();
    cleanup();
  });

  it('exits annotate mode and tears down freeze interactivity lock', async () => {
    renderInOnUiHost();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle onUI panel' }));
    await user.click(screen.getByRole('button', { name: 'Toggle annotate mode' }));

    await waitFor(() => {
      expect(mockCaptureViewport).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: 'Toggle annotate mode' }));

    await waitFor(() => {
      const annotateButton = screen.getByRole('button', { name: 'Toggle annotate mode' });
      expect(annotateButton.className).not.toContain('is-active');
      expect(mockRestorePageInteractivity).toHaveBeenCalled();
    });
  });
});
