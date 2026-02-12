/**
 * Content script entry point
 */

import { renderApp } from './render';

console.log('[onUI] Content script loaded');

// Initialize the UI
renderApp();
