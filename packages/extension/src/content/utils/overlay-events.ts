export const ONUI_SHADOW_HOST_ID = 'onui-shadow-host';

function getComposedPath(event: Event): EventTarget[] {
  if (typeof event.composedPath === 'function') {
    return event.composedPath();
  }

  return [];
}

export function isOnUiOverlayEvent(event: Event): boolean {
  const target = event.target;
  if (target instanceof Element) {
    if (target.id === ONUI_SHADOW_HOST_ID) {
      return true;
    }

    if (target.closest(`#${ONUI_SHADOW_HOST_ID}`)) {
      return true;
    }
  }

  return getComposedPath(event).some((node) => {
    return node instanceof Element && node.id === ONUI_SHADOW_HOST_ID;
  });
}

export function stopEventPropagation(event: Event, preventDefault = false): void {
  if (preventDefault && event.cancelable) {
    event.preventDefault();
  }

  event.stopPropagation();
  event.stopImmediatePropagation();
}
