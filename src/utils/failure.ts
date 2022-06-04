import SuperError from '@andrewscwei/super-error'

/**
 * A factory that generates throwable application-wide errors with the ability to preserve the
 * cause of the error.
 *
 * @param code - The code to be associated with the generated error.
 * @param cause - Optional cause of this error.
 *
 * @returns The generated error.
 */
export default function failure(code: string, cause?: unknown): SuperError {
  const error = new SuperError(code, code, undefined, SuperError.deserialize(cause))
  return error
}
