import _ from 'lodash'
import fault from '../../utils/fault'
import { getRedisCache, setRedisCache } from '../../utils/redis'
import getRequest from '../utils/getRequest'

type Params = {
  collectionId: string
}

const getMagicEdenCollectionFloorPrice = async ({ collectionId }: Params) => {
  try {
    const redisKey = `btc:collectionFloorPrice:${collectionId}`

    const data = await getRedisCache(redisKey)

    if (data) {
      const timestamp = _.get(data, 'timestamp')

      if (Date.now() - timestamp <= 60 * 5 * 1000) {
        return _.get(data, 'floorPrice')
      }
    }

    try {
      const res = await getRequest(`https://api-mainnet.magiceden.dev/v2/ord/btc/stat?collectionSymbol=${collectionId}`)

      const floorPrice = _.get(res, 'floorPrice')

      setRedisCache(redisKey, { floorPrice })

      return floorPrice
    }
    catch (err) {
      if (data) {
        return _.get(data, 'floorPrice')
      }

      return 0
    }
  }
  catch (err) {
    throw fault('ERR_GET_MAGIC_EDEN_COLLECTION_FLOOR_PRICE', undefined, err)
  }
}

export default getMagicEdenCollectionFloorPrice
