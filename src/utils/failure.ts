import SuperError from '@andrewscwei/super-error'

export default function failure(code?: string, cause?: unknown): SuperError {
  const error = new SuperError(undefined, code, undefined, cause)
  return error
}