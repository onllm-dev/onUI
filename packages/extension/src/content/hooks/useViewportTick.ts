import { useEffect, useRef, useState } from 'preact/hooks';

/**
 * Emits a monotonically increasing value on viewport-affecting events.
 * Capturing scroll catches nested scroll containers too.
 */
export function useViewportTick(): number {
  const [tick, setTick] = useState(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const scheduleTick = () => {
      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        setTick((value) => value + 1);
      });
    };

    window.addEventListener('scroll', scheduleTick, { capture: true, passive: true });
    window.addEventListener('resize', scheduleTick);

    return () => {
      window.removeEventListener('scroll', scheduleTick, { capture: true });
      window.removeEventListener('resize', scheduleTick);

      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  return tick;
}
