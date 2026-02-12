/**
 * Content script entry point
 */

import { renderApp } from './render';

console.log('[onUI] Content script loaded');

declare global {
  interface Window {
    __ONUI_CONTENT_BOOTSTRAPPED__?: boolean;
  }
}

if (!window.__ONUI_CONTENT_BOOTSTRAPPED__) {
  window.__ONUI_CONTENT_BOOTSTRAPPED__ = true;
  // Initialize the UI once per page context.
  renderApp();
}
