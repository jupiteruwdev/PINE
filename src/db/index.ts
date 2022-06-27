import mongoose from 'mongoose'
import appConf from '../app.conf'
import logger from '../utils/logger'

export * from './collections'
export * from './models'

export const initDb = () => {
  try {
    mongoose.connect(appConf.mongoUri, { autoIndex: false })

    const db = mongoose.connection
    db.on('error', () => logger.error('connection error:'))
    db.once('open', () => logger.info('connected!'))
  }
  catch (err: any) {
    logger.error(err.message)
    throw err
  }
}
