export type ErrorHandler = (error: unknown, context?: string) => void;

/**
 * Format an error for display
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: string): void {
  const prefix = '[onUI]';
  const contextStr = context ? ` ${context}:` : '';
  console.error(`${prefix}${contextStr}`, error);
}

/**
 * Create an error handler with context
 */
export function createErrorHandler(context: string): ErrorHandler {
  return (error: unknown) => {
    logError(error, context);
  };
}

/**
 * Safely execute an async function with error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  onError?: ErrorHandler
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    onError?.(error);
    return null;
  }
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  onError?: ErrorHandler
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      onError?.(error);
      throw error;
    }
  }) as T;
}
