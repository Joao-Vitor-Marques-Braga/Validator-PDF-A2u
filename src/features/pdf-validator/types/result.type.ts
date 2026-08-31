/**
 * Generic Result pattern for robust and expressive error handling
 * without throwing unhandled exceptions.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T; readonly error?: never }
  | { readonly ok: false; readonly error: E; readonly value?: never };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  fail<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },
  isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
    return result.ok === true;
  },
  isFail<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
    return result.ok === false;
  },
};
