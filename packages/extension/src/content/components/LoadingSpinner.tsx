interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: 16,
  medium: 24,
  large: 32,
};

/**
 * Simple CSS spinner for loading states
 */
export function LoadingSpinner({ size = 'medium' }: LoadingSpinnerProps) {
  const dimension = SIZES[size];

  return (
    <div
      class="onui-loading-spinner"
      style={{
        width: `${dimension}px`,
        height: `${dimension}px`,
      }}
    />
  );
}
