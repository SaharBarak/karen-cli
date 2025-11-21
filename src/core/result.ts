/**
 * Result monad utilities using neverthrow
 * Similar to Michael Bull's kotlin-result
 */

import { Result, ok, err } from 'neverthrow';

export { Result, ok, err } from 'neverthrow';

/**
 * Error types for Karen CLI
 */
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  BROWSER_ERROR = 'BROWSER_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AI_ERROR = 'AI_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class KarenError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'KarenError';
  }

  static networkError(message: string, cause?: unknown): KarenError {
    return new KarenError(ErrorCode.NETWORK_ERROR, message, cause);
  }

  static browserError(message: string, cause?: unknown): KarenError {
    return new KarenError(ErrorCode.BROWSER_ERROR, message, cause);
  }

  static configError(message: string, cause?: unknown): KarenError {
    return new KarenError(ErrorCode.CONFIG_ERROR, message, cause);
  }

  static validationError(message: string, cause?: unknown): KarenError {
    return new KarenError(ErrorCode.VALIDATION_ERROR, message, cause);
  }

  static aiError(message: string, cause?: unknown): KarenError {
    return new KarenError(ErrorCode.AI_ERROR, message, cause);
  }

  static fileSystemError(message: string, cause?: unknown): KarenError {
    return new KarenError(ErrorCode.FILE_SYSTEM_ERROR, message, cause);
  }

  static unknown(message: string, cause?: unknown): KarenError {
    return new KarenError(ErrorCode.UNKNOWN_ERROR, message, cause);
  }
}

/**
 * Type alias for common result patterns
 */
export type KarenResult<T> = Result<T, KarenError>;

/**
 * Utility to wrap async functions in Result
 */
export async function resultify<T>(
  fn: () => Promise<T>,
  errorMapper?: (error: unknown) => KarenError
): Promise<KarenResult<T>> {
  try {
    const result = await fn();
    return ok(result);
  } catch (error) {
    const karenError = errorMapper
      ? errorMapper(error)
      : KarenError.unknown('An unexpected error occurred', error);
    return err(karenError);
  }
}

/**
 * Utility to wrap sync functions in Result
 */
export function resultifySync<T>(
  fn: () => T,
  errorMapper?: (error: unknown) => KarenError
): KarenResult<T> {
  try {
    const result = fn();
    return ok(result);
  } catch (error) {
    const karenError = errorMapper
      ? errorMapper(error)
      : KarenError.unknown('An unexpected error occurred', error);
    return err(karenError);
  }
}
