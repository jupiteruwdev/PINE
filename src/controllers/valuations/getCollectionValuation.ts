import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Valuation, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import redis from '../../utils/redis'
import rethrow from '../../utils/rethrow'
import getRequest from '../utils/getRequest'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId?: string
}

type UseReservoirParams = {
  collectionAddress: string
  nftId?: string
  apiBaseUrl: string
  apiKey: string
}

async function useReservoirByTokenDetails({ collectionAddress, nftId, apiBaseUrl, apiKey }: UseReservoirParams) {
  try {
    const res = await getRequest(`${apiBaseUrl}/tokens/v6`, {
      headers: {
        'x-api-key': apiKey,
      },
      params: {
        tokens: `${collectionAddress}:${nftId}`,
      },
    })

    if (!res.tokens?.length) rethrow(`Fetching token info for collection ${collectionAddress} and nftId ${nftId} failed`)

    const collectionId = _.get(res.tokens[0], 'token.collection.id')

    if (!collectionId) rethrow(`Extracting collection id for collection ${collectionAddress} and nftId ${nftId} failed`)

    const collectionInfo = await getRequest(`${apiBaseUrl}/collections/v6`, {
      headers: {
        'x-api-key': apiKey,
      },
      params: {
        id: collectionId,
      },
    })

    return collectionInfo
  }
  catch (err) {
    throw fault('ERR_USE_RESERVOIR_TOKEN_DETAILS', undefined, err)
  }
}

export async function useReservoir({ collectionAddress, apiBaseUrl, apiKey, nftId }: UseReservoirParams): Promise<Valuation> {
  try {

    let collectionInfo

    if (nftId) {
      collectionInfo = await useReservoirByTokenDetails({ collectionAddress, apiBaseUrl, apiKey, nftId })
    }
    else {
      collectionInfo = await getRequest(`${apiBaseUrl}/collections/v6`, {
        headers: {
          'x-api-key': apiKey,
        },
        params: {
          contract: collectionAddress,
        },
      })
    }

    if (!collectionInfo.collections?.length) rethrow(`Fetching collection info for collection ${collectionAddress} and nftId ${nftId} failed`)

    const floorPrice = _.get(collectionInfo.collections[0], 'floorAsk.price.amount.native')

    if (!floorPrice) rethrow(`Extracting collection floor price for collection ${collectionAddress} and nftId ${nftId} failed`)

    const valuation = Valuation.factory({
      value: Value.$ETH(floorPrice),
    })

    return valuation
  }
  catch (err) {
    throw fault('ERR_USE_RESERVOIR', undefined, err)
  }
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

    const newValue = await useReservoir({ collectionAddress, nftId, apiBaseUrl, apiKey })
    await redis.setRedisCache(redisKey, newValue, {
      EX: 600,
    })

    return newValue
  }
  catch (err) {
    throw fault('ERR_GET_COLLECTION_VALUATION', undefined, err)
  }
}
