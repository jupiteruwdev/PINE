import SuperError from '@andrewscwei/super-error'

/**
 * Throws an application fault. Useful for catching a generic {@link Error} and rethrowing it as a
 * fault, or simply throwing a string as a fault.
 *
 * @param error - A value to be deserialized into a {@link SuperError}.
 */
export default function rethrow(error: unknown): never {
  throw SuperError.deserialize(error)
}
