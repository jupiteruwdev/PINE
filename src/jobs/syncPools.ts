import { syncPools } from '../controllers'
import { initDb } from '../database'
import fault from '../utils/fault'
import logger from '../utils/logger'

export default async function syncPoolsJob() {
  try {
    await initDb({
      onError: err => {
        logger.error('Establishing database conection... ERR:', err)
        throw fault('ERR_DB_CONNECTION', undefined, err)
      },
      onOpen: () => {
        logger.info('Establishing database connection... OK')
      },
    })

    await syncPools()
  }
  catch (err) {
    logger.error('JOB_SYNC_POOLS Handling runtime error... ERR:', err)
    throw err
  }
}

syncPoolsJob()
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1) // Retry Job Task by exiting the process
  })
