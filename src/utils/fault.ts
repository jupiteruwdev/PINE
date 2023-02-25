import SuperError from '@andrewscwei/super-error'

/**
 * A factory function that generates application-wide errors. It is best to throw errors generated
 * by this method for readability and maintainability purposes.
 *
 * @param code - The code to be associated with the generated error. This code will be used as the
 *               key to localize the error message.
 * @param message - Optional message of this error.
 * @param cause - Optional cause of this error.
 *
 * @returns The generated error.
 */
export default function fault(code: string, message?: string, cause?: unknown): SuperError {
  const error = new SuperError(message ?? code, code, undefined, cause ? SuperError.deserialize(cause) : undefined)
  return error
}
