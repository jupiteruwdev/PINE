import SuperError from '@andrewscwei/super-error'

export default function rethrow(error: unknown): never {
  throw SuperError.deserialize(error)
}
