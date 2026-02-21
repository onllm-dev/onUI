import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  preactRender: vi.fn(),
  shadowInit: vi.fn(),
  shadowDestroy: vi.fn(),
}));

vi.mock('preact', () => ({
  render: mocks.preactRender,
}));

vi.mock('./shadow-host', () => ({
  shadowHost: {
    init: mocks.shadowInit,
    destroy: mocks.shadowDestroy,
  },
}));

import { renderApp } from './render';

function createShadowRoot(): ShadowRoot {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host.attachShadow({ mode: 'open' });
}

describe('renderApp', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mocks.preactRender.mockReset();
    mocks.shadowInit.mockReset();
    mocks.shadowDestroy.mockReset();
  });

  it('reuses a single #onui-app container across repeated renders', () => {
    const shadowRoot = createShadowRoot();
    mocks.shadowInit.mockReturnValue(shadowRoot);

    renderApp();
    renderApp();

    const containers = shadowRoot.querySelectorAll('#onui-app');
    expect(containers).toHaveLength(1);
    expect(mocks.preactRender).toHaveBeenCalledTimes(2);
    expect(mocks.preactRender.mock.calls[0]?.[1]).toBe(containers[0]);
    expect(mocks.preactRender.mock.calls[1]?.[1]).toBe(containers[0]);
  });

  it('removes duplicate #onui-app containers left by prior injections', () => {
    const shadowRoot = createShadowRoot();
    const first = document.createElement('div');
    first.id = 'onui-app';
    const second = document.createElement('div');
    second.id = 'onui-app';
    shadowRoot.appendChild(first);
    shadowRoot.appendChild(second);
    mocks.shadowInit.mockReturnValue(shadowRoot);

    renderApp();

    const containers = shadowRoot.querySelectorAll('#onui-app');
    expect(containers).toHaveLength(1);
    expect(containers[0]).toBe(first);
    expect(mocks.preactRender).toHaveBeenCalledTimes(1);
  });
});

