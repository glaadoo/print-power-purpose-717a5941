/**
 * API retry logic with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: any, attempt: number) => {
    // Retry on network errors, timeouts, 5xx errors
    // Don't retry on 4xx client errors (except 429 rate limit)
    if (error?.status === 429) return true; // Rate limit
    if (error?.status >= 400 && error?.status < 500) return false; // Client error
    return attempt < 3; // Retry on network/server errors
  },
};

/**
 * Executes an async function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt >= opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delayMs = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      console.warn(
        `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${delayMs}ms...`,
        error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Wrapper for Supabase function invocations with retry
 */
export async function invokeWithRetry<T = any>(
  supabase: any,
  functionName: string,
  options?: { body?: any; headers?: Record<string, string> },
  retryOptions?: RetryOptions
): Promise<{ data: T | null; error: any }> {
  return withRetry(
    async () => {
      const { data, error } = await supabase.functions.invoke(functionName, options);
      if (error) throw error;
      return { data, error: null };
    },
    retryOptions
  );
}
