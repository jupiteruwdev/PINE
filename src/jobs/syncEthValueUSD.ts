import { NextFunction, Request, Response } from 'express'
import getEthValueUSD from '../controllers/utils/getEthValueUSD'
import { PriceModel } from '../db'
import logger from '../utils/logger'

export default async function syncEthValueUSD(req: Request, res: Response, next: NextFunction) {
  try {
    logger.info('JOB_SYNC_ETH_VALUE_USD: fetching eth price in usd')
    const usdPrice = await getEthValueUSD()

    const ethPrice = await PriceModel.findOne({ name: 'eth' })
    if (ethPrice) {
      await ethPrice.update({
        value: usdPrice,
      })
    }
    else {
      await PriceModel.create({
        name: 'eth',
        value: usdPrice,
      })
    }
    logger.info('JOB_SYNC_ETH_VALUE_USD: fetching eth price in usd... OK')
    res.status(200).send()
  }
  catch (err) {
    logger.error('JOB_SYNC_ETH_VALUE_USD: Handling runtime error... ERR:', err)
    next(err)
  }
}
