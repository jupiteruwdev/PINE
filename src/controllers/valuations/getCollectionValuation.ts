import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Valuation } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import redis from '../../utils/redis'
import rethrow from '../../utils/rethrow'
import { useReservoirCollectionValuation } from './useReservoirAPI'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId?: string
}

export default async function getCollectionValuation({
  blockchain,
  collectionAddress,
  nftId,
}: Params): Promise<Valuation> {
  try {
    const apiKey = _.get(appConf.reservoirAPIKey, blockchain.networkId) ?? rethrow('Missing Reservoir API key')
    const apiBaseUrl = _.get(appConf.reservoirAPIBaseUrl, blockchain.networkId) ?? rethrow('Missing Reservoir Base Url')
    const redisKey = `${collectionAddress}:valuation:eth`
    const cachedValue = await redis.getRedisCache(redisKey)

    if (cachedValue) {
      logger.info(`Cached ${collectionAddress} valuation in ETH:`, cachedValue)
      return cachedValue as Valuation
    }

    const newValue = await useReservoirCollectionValuation({ collectionAddress, nftId, apiBaseUrl, apiKey })
    await redis.setRedisCache(redisKey, newValue, {
      EX: 600,
    })

    return newValue
  }
  catch (err) {
    throw fault('ERR_GET_COLLECTION_VALUATION', undefined, err)
  }
}
