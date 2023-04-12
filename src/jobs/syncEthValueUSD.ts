import { NextFunction, Request, Response } from 'express'
import getEthValueUSD from '../controllers/utils/getEthValueUSD'
import { AvailableToken } from '../controllers/utils/getTokenUSDPrice'
import { PriceModel } from '../db'
import logger from '../utils/logger'

export default async function syncEthValueUSD(req: Request, res: Response, next: NextFunction) {
  try {
    try {
      for (const token of Object.keys(AvailableToken).filter(key => key !== 'PINE')) {
        logger.info(`JOB_SYNC_ETH_VALUE_USD fetching ${AvailableToken[token as keyof typeof AvailableToken]} price in usd`)
        const tokenPrice = await getEthValueUSD(1, AvailableToken[token as keyof typeof AvailableToken])
        const price = await PriceModel.findOne({ name: AvailableToken[token as keyof typeof AvailableToken] })
        if (price) {
          await price.update({
            value: tokenPrice,
          })
        }
        else {
          await PriceModel.create({
            name: AvailableToken[token as keyof typeof AvailableToken],
            value: tokenPrice,
          })
        }
        logger.info(`JOB_SYNC_ETH_VALUE_USD fetching ${AvailableToken[token as keyof typeof AvailableToken]} price in usd... OK`)
      }
    }
    catch (err) {
      logger.info('JOB_SYNC_ETH_VALUE_USD fetching eth price in usd... ERR:', err)
    }
    res.status(200).send()
  }
  catch (err) {
    logger.error('JOB_SYNC_ETH_VALUE_USD: Handling runtime error... ERR:', err)
    next(err)
  }
}
