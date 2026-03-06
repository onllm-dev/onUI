/**
 * Background service worker entry point
 */

import { setupMessageHandler } from './messages';
import { bootstrapNativeSync } from './native-sync';
import { webext } from '@/shared/webext';

console.log('[onUI] Background service worker initialized');

// Set up message handling
setupMessageHandler();
void bootstrapNativeSync();

// Listen for extension install/update
webext.runtime.onInstalled.addListener((details) => {
  console.log('[onUI] Extension installed/updated:', details.reason);
});
