import getPineValueUSD from '../controllers/utils/getPineValueUSD'
import { PriceModel, initDb } from '../db'
import fault from '../utils/fault'
import logger from '../utils/logger'
import _ from 'lodash'
import { getRedisCache, setRedisCache } from '../utils/redis'

export default async function syncPINEValueUSD() {
  try {
    const redisKey = 'pine:value:usd'

    const cachedValue = await getRedisCache(redisKey)

    if (cachedValue) {
      const timestamp = _.get(cachedValue, 'timestamp')
      if (Date.now() - timestamp <= 60 * 5 * 1000) {
        logger.info('Cached PINE value in USD:', cachedValue)
        return
      }
    }
    await initDb({
      onError: err => {
        logger.error('Establishing database conection... ERR:', err)
        throw fault('ERR_DB_CONNECTION', undefined, err)
      },
      onOpen: () => {
        logger.info('Establishing database connection... OK')
      },
    })
    logger.info('JOB_SYNC_PINE_VALUE_USD: fetching pine price in usd')
    const usdPrice = await getPineValueUSD()

    await setRedisCache(redisKey, usdPrice)

    const pinePrice = await PriceModel.findOne({ name: 'pine' })
    if (pinePrice) {
      await pinePrice.update({
        value: usdPrice,
      })
    }
    else {
      await PriceModel.create({
        name: 'pine',
        value: usdPrice,
      })
    }
    logger.info('JOB_SYNC_PINE_VALUE_USD: fetching pine price in usd... OK')
  }
  catch (err) {
    logger.error('JOB_SYNC_PINE_VALUE_USD: Handling runtime error... ERR:', err)
    process.exit(1)
  }
}

syncPINEValueUSD()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1) // Retry Job Task by exiting the process
  })
