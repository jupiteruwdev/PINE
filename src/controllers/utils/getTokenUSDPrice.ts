import _ from 'lodash'
import { PriceModel } from '../../db'
import { AnyCurrency, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getEthValueUSD from './getEthValueUSD'
import getPineValueUSD from './getPineValueUSD'

export enum AvailableToken {
  ETH = 'eth',
  PINE = 'pine',
  MATIC = 'matic'
}

async function fetchTokenPrice(token: AvailableToken = AvailableToken.ETH): Promise<Value<AnyCurrency>> {
  logger.info(`Fetching token price for ${token}...`)

  switch (token) {
  case AvailableToken.ETH:
  case AvailableToken.MATIC:
    return getEthValueUSD(undefined, token)
  case AvailableToken.PINE:
    return getPineValueUSD()
  }
}

export default async function getTokenUSDPrice(token: AvailableToken = AvailableToken.ETH): Promise<Value<AnyCurrency>> {
  try {
    logger.info(`Get token price for ${token}...`)

    const price = await PriceModel.findOne({ name: token }).lean()
    const updatedAt = new Date(_.get(price, 'updatedAt') as unknown as string | number)
    const now = Date.now()

    if (updatedAt.getTime() >= now - 60 * 5 * 1000) {
      return Value.factory({
        amount: price?.value?.amount,
        currency: price?.value?.currency,
      })
    }

    return fetchTokenPrice(token)
  }
  catch (err) {
    logger.info(`Get token price for ${token}... ERR:`, err)
    throw fault('ERR_GET_TOKEN_PRICE', undefined, err)
  }
}
