import _ from 'lodash'
import { AnyCurrency, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getEthValueUSD from './getEthValueUSD'
import getPineValueUSD from './getPineValueUSD'
import { getRedisCache, setRedisCache } from '../../utils/redis'

export enum AvailableToken {
  ETH = 'eth',
  PINE = 'pine',
  MATIC = 'matic',
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

    const redisKey = `${token}:value:usd`

    const cachedValue = await getRedisCache(redisKey)

    if (cachedValue) {
      const timestamp = _.get(cachedValue, 'timestamp')
      if (Date.now() - timestamp <= 60 * 1 * 1000) {
        logger.info(`Cached ${token} value in USD:`, cachedValue)
        return cachedValue
      }
    }

    const usdPrice = await fetchTokenPrice(token)
    await setRedisCache(redisKey, usdPrice)
    return usdPrice
  }
  catch (err) {
    logger.info(`Get token price for ${token}... ERR:`, err)
    throw fault('ERR_GET_TOKEN_PRICE', undefined, err)
  }
}
