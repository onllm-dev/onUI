import { useState, useEffect } from 'preact/hooks';

interface ErrorToastProps {
  message: string;
  onDismiss?: () => void;
  duration?: number;
}

/**
 * Toast notification for displaying errors
 */
export function ErrorToast({
  message,
  onDismiss,
  duration = 5000,
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div class="onui-error-toast">
      <div class="onui-error-toast-content">
        <svg
          class="onui-error-toast-icon"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="onui-error-toast-message">{message}</span>
      </div>
      <button
        class="onui-error-toast-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
