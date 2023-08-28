import { Blockchain, Valuation } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import redis from '../../utils/redis'
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
    const redisKey = `${collectionAddress}:valuation:eth`
    const cachedValue = await redis.getRedisCache(redisKey)

    if (cachedValue) {
      logger.info(`Cached ${collectionAddress} valuation in ETH:`, cachedValue)
      return cachedValue as Valuation
    }

    const newValue = await useReservoirCollectionValuation({ collectionAddress, nftId, blockchain })
    await redis.setRedisCache(redisKey, newValue, {
      EX: 600,
    })

    return newValue
  }
  catch (err) {
    throw fault('ERR_GET_COLLECTION_VALUATION', undefined, err)
  }
}
