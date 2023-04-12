import { NextFunction, Request, Response } from 'express'
import getPineValueUSD from '../controllers/utils/getPineValueUSD'
import { PriceModel } from '../db'
import logger from '../utils/logger'

export default async function syncPINEValueUSD(req: Request, res: Response, next: NextFunction) {
  try {
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
    next(err)
  }
}
