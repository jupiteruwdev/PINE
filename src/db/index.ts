import mongoose, { Connection } from 'mongoose'
import appConf from '../app.conf'
import fault from '../utils/fault'
import logger from '../utils/logger'

export * from './models'

export async function initDb(): Promise<Connection> {
  try {
    const db = mongoose.connection
    db.on('error', err => logger.error('Handling database connection error... ERR:', err))
    db.once('open', () => logger.info('Establishing database connection... OK'))

    await mongoose.connect(appConf.mongoUri, { autoIndex: false })

    return db
  }
  catch (err) {
    logger.error('Establishing database conection... ERR:', err)
    throw fault('ERR_DB_CONNECTION', undefined, err)
  }
}
