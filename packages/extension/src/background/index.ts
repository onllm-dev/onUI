/**
 * Background service worker entry point
 */

import { setupMessageHandler } from './messages';

console.log('[onUI] Background service worker initialized');

// Set up message handling
setupMessageHandler();

// Listen for extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[onUI] Extension installed/updated:', details.reason);
});
