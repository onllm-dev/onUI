import { describe, expect, it } from 'vitest';
import { injectStyles } from './index';

describe('injectStyles', () => {
  it('injects styles once per shadow root', () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });

    injectStyles(shadowRoot);
    injectStyles(shadowRoot);

    const styleTags = shadowRoot.querySelectorAll('style[data-onui-styles="base"]');
    expect(styleTags).toHaveLength(1);
    expect(styleTags[0]?.textContent?.length ?? 0).toBeGreaterThan(0);
  });
});

