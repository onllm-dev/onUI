/**
 * Background service worker entry point
 */

import { setupMessageHandler } from './messages';
import { bootstrapNativeSync } from './native-sync';
import { suppressOnUiDebugLogs } from '@/shared/logging';

// Keep onUI debug logs opt-in in production builds.
suppressOnUiDebugLogs();
console.log('[onUI] Background service worker initialized');

// Set up message handling
setupMessageHandler();
void bootstrapNativeSync();

// Listen for extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[onUI] Extension installed/updated:', details.reason);
});
