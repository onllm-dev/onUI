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

  // Create container for Preact
  const container = document.createElement('div');
  container.id = 'onui-app';
  shadowRoot.appendChild(container);

  // Render Preact app
  preactRender(<App />, container);
}

/**
 * Unmount the extension UI
 */
export function unmountApp(): void {
  shadowHost.destroy();
}
