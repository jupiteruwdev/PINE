import { AnyCurrency, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getEthValueUSD from './getEthValueUSD'
import { getPineValueUSD } from './getPineValueUSD'
import redis from '../../utils/redis'

export enum AvailableToken {
  ETH = 'eth',
  PINE = 'pine',
  MATIC = 'matic',
}

async function fetchTokenPrice(token: AvailableToken): Promise<Value<AnyCurrency>> {
  logger.info(`Fetching token price for ${token}...`)

  switch (token) {
  case AvailableToken.ETH:
  case AvailableToken.MATIC:
    return getEthValueUSD.getEthValueUSD(undefined, token)
  case AvailableToken.PINE:
    return getPineValueUSD()
  default:
    throw new Error(`Unsupported token: ${token}`)
  }
}

export default async function getTokenUSDPrice(token: AvailableToken): Promise<Value<AnyCurrency>> {
  try {
    logger.info(`Get token price for ${token}...`)

    const redisKey = `${token}:value:usd`
    let usdPrice: Value<AnyCurrency>
    const cachedValue = await redis.getRedisCache(redisKey)

    if (cachedValue) {
      logger.info(`Cached ${token} value in USD:`, cachedValue)
      usdPrice = cachedValue
    }
    else {
      logger.info(`Get ${token} value in USD from coingeco...`)
      usdPrice = await fetchTokenPrice(token)
      logger.info(`${token} value from coingeco in USD:`, usdPrice)
      await redis.setRedisCache(redisKey, usdPrice, {
        EX: 60,
      })
    }
    return usdPrice
  }
  catch (err) {
    logger.info(`Get token price for ${token}... ERR:`, err)
    throw fault('ERR_GET_TOKEN_PRICE', undefined, err)
  }
}
