import { render as preactRender } from 'preact';
import { shadowHost } from './shadow-host';
import { injectStyles } from './styles';
import { App } from './components/App';

/**
 * Initialize and render the extension UI into the shadow DOM
 */
export function renderApp(): void {
  const shadowRoot = shadowHost.init();

  // Inject styles
  injectStyles(shadowRoot);

  // Reuse existing app container to keep mount idempotent.
  const existingContainers = shadowRoot.querySelectorAll<HTMLDivElement>('#onui-app');
  const container = existingContainers[0] ?? document.createElement('div');
  if (!existingContainers[0]) {
    container.id = 'onui-app';
    shadowRoot.appendChild(container);
  }

  // Clean up accidental duplicate containers from previous injections.
  if (existingContainers.length > 1) {
    for (let i = 1; i < existingContainers.length; i += 1) {
      existingContainers[i]?.remove();
    }
  }

  // Render Preact app
  preactRender(<App />, container);
}

/**
 * Unmount the extension UI
 */
export function unmountApp(): void {
  shadowHost.destroy();
}
