/**
 * Utilities for making the page inert during freeze mode.
 * Blocks user interactions while allowing our overlay to function.
 */

import { isOnUiOverlayEvent } from './overlay-events';

/** Keys that affect scrolling/navigation */
const SCROLL_KEYS = new Set([
  'Space',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'ArrowUp',
  'ArrowDown',
]);

/** Event types to block during inert mode */
const BLOCKED_EVENT_TYPES = [
  'pointerdown',
  'mousedown',
  'click',
  'scroll',
  'wheel',
  'touchstart',
  'touchmove',
] as const;

interface CleanupState {
  listeners: Array<{ type: string; handler: EventListener }>;
  originalOverflow: string;
}

let cleanupState: CleanupState | null = null;

/**
 * Block an event if it originates from the host page (not our overlay).
 */
function blockHostPageEvent(event: Event): void {
  if (isOnUiOverlayEvent(event)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
}

/**
 * Block keyboard events that affect scrolling.
 */
function blockScrollKeyEvent(event: KeyboardEvent): void {
  if (isOnUiOverlayEvent(event)) {
    return;
  }

  if (SCROLL_KEYS.has(event.code)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/**
 * Make the page inert by blocking user interactions.
 * This prevents scrolling, clicking, and other interactions on the host page
 * while allowing our overlay to remain interactive.
 */
export function makePageInert(): void {
  if (cleanupState !== null) {
    // Already inert, skip
    return;
  }

  const listeners: CleanupState['listeners'] = [];

  // Store original overflow style
  const originalOverflow = document.documentElement.style.overflow;

  // Prevent scrolling via overflow
  document.documentElement.style.overflow = 'hidden';

  // Add capture-phase listeners to block events before they reach the page
  for (const eventType of BLOCKED_EVENT_TYPES) {
    const handler = blockHostPageEvent as EventListener;
    window.addEventListener(eventType, handler, { capture: true });
    listeners.push({ type: eventType, handler });
  }

  // Block keyboard events that affect scrolling
  const keydownHandler = blockScrollKeyEvent as EventListener;
  window.addEventListener('keydown', keydownHandler, { capture: true });
  listeners.push({ type: 'keydown', handler: keydownHandler });

  cleanupState = {
    listeners,
    originalOverflow,
  };
}

/**
 * Restore page interactivity by removing all blocking listeners.
 */
export function restorePageInteractivity(): void {
  if (cleanupState === null) {
    return;
  }

  // Remove all listeners
  for (const { type, handler } of cleanupState.listeners) {
    window.removeEventListener(type, handler, { capture: true });
  }

  // Restore original overflow style
  document.documentElement.style.overflow = cleanupState.originalOverflow;

  cleanupState = null;
}
