import getPineValueUSD from '../controllers/utils/getPineValueUSD'
import { PriceModel, initDb } from '../db'
import fault from '../utils/fault'
import logger from '../utils/logger'

export default async function syncPINEValueUSD() {
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
    logger.info('JOB_SYNC_PINE_VALUE_USD: fetching pine price in usd')
    const usdPrice = await getPineValueUSD()

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

    res.status(200).send()
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
