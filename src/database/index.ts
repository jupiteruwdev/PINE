import mongoose, { Connection } from 'mongoose'

export * from './models'

type InitOptions = {
  onError?: (error: Error) => void
  onOpen?: () => void
}

export async function initDb({ onError, onOpen }: InitOptions = {}): Promise<Connection> {
  const uri = process.env.MONGO_URI
  if (!uri) throw Error('No valid MongoDB URI provided')

  const connection = mongoose.connection
  connection.on('error', err => onError?.(err))
  connection.once('open', () => onOpen?.())

  await mongoose.connect(uri, { autoIndex: false })

  return connection
}
