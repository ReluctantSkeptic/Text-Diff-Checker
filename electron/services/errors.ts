import type { CompareError, CompareErrorCode } from '../../src/shared/compare';

export class CompareServiceError extends Error {
  readonly code: CompareErrorCode;

  constructor(code: CompareErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'CompareServiceError';
  }
}

export function toCompareError(error: unknown): CompareError {
  if (error instanceof CompareServiceError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unexpected error while comparing content.',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Unexpected error while comparing content.',
  };
}
