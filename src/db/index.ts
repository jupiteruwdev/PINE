import mongoose from 'mongoose'
import appConf from '../app.conf'
import logger from '../utils/logger'

export * from './collections'
export * from './models'

export const initDb = () => {
  try {
    mongoose.connect(appConf.mongoUri, { autoIndex: false })

    const db = mongoose.connection
    db.on('error', err => logger.error('Handling database connection error... ERR:', err))
    db.once('open', () => logger.info('Establishing database connection... OK'))
  }
  catch (err) {
    logger.error('Establishing database conection... ERR:', err)
    throw err
  }
}
