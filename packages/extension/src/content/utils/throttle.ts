/**
 * Throttle function execution to a maximum rate
 * Returns both the throttled function and a cancel function to clear pending timers
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
): { throttled: T; cancel: () => void } {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= ms) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      // Schedule call for the remaining time
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, ms - timeSinceLastCall);
    }
  };

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { throttled: throttled as T, cancel };
}
