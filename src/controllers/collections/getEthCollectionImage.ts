import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getRedisCache, setRedisCache } from '../../utils/redis'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'
import { useReservoirCollections } from '../utils/useReservoirAPI'

type Params = {
  blockchain: Blockchain
  collectionAddress?: string
  matchSubcollectionBy?: {
    value: string
    type: 'poolAddress' | 'nftId'
  }
}

export default async function getEthCollectionImage({
  blockchain,
  ...params
}: Params): Promise<string | undefined> {
  try {
    logger.info(`Fetching imageUrl for collection using params <${JSON.stringify(params)}> on blockchain <${JSON.stringify(blockchain)}>...`)

    const redisKey = `COL_IMG_${params.collectionAddress}_${params.matchSubcollectionBy?.value}_${blockchain.networkId}`

    let imageUrl = await getRedisCache(redisKey)

    if (imageUrl) {
      return imageUrl.imageUrl
    }

    switch (blockchain.network) {
    case 'ethereum':
      imageUrl = await DataSource.fetch(
        useOpenSea({ blockchain, ...params }),
        useReservoir({ blockchain, ...params }),
      )
      break
    case 'polygon':
    case 'arbitrum':
      imageUrl = await DataSource.fetch(
        useReservoir({ blockchain, ...params }),
      )
      break
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }

    await setRedisCache(redisKey, { imageUrl })

    logger.info(`Fetching imageUrl for collection using params <${JSON.stringify(params)}> on blockchain <${JSON.stringify(blockchain)}>... OK`)

    return imageUrl
  }
  catch (err) {
    logger.warn(`Fetching imageUrl for collection using params <${JSON.stringify(params)}> on blockchain <${JSON.stringify(blockchain)}>... WARN`)
    if (logger.isWarnEnabled() && !logger.silent) console.warn(err)

    return undefined
  }
}

export function useOpenSea({ blockchain, collectionAddress }: Params): DataSource<string> {
  return async () => {
    try {
      logger.info(`...using OpenSea to look up imageUrl for collection ${collectionAddress}`)

      if (collectionAddress === undefined) rethrow('Collection address must be provided')
      if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

      const apiKey = appConf.openseaAPIKey ?? rethrow('Missing OpenSea API key')
      let res

      switch (blockchain.networkId) {
      case Blockchain.Ethereum.Network.MAIN:
        res = await getRequest(`https://api.opensea.io/api/v1/asset_contract/${collectionAddress}`, { headers: { 'X-API-KEY': apiKey } }).catch(err => rethrow(`Failed to fetch imageUrl from OpenSea for collection <${collectionAddress}>: ${err}`))
        break
      case Blockchain.Ethereum.Network.RINKEBY:
        res = await getRequest(`https://testnets-api.opensea.io/api/v1/asset_contract/${collectionAddress}`, { headers: { 'X-API-KEY': apiKey } }).catch(err => rethrow(`Failed to imageUrl from OpenSea for collection <${collectionAddress}>: ${err}`))
        break
      }

      if (res === undefined) rethrow('Unexpected payload when looking up collection imageUrl from OpenSea')

      const imageUrl = _.get(res, 'collection.image_url')

      if (!imageUrl) rethrow('Unknown collection image')

      return imageUrl
    }
    catch (err) {
      throw fault('GET_ETH_COLLECTION_IMAGE_USE_OPENSEA', undefined, err)
    }
  }
}

export function useReservoir({ blockchain, collectionAddress }: Params): DataSource<string> {
  return async () => {
    try {
      logger.info(`...using Reservoir to look up imageUrl for collection <${collectionAddress}>`)

      if (collectionAddress === undefined) rethrow('Collection address must be provided')
      if (!Blockchain.isEVMChain(blockchain)) rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

      const collectionsInfo = await useReservoirCollections({ collectionAddresses: [collectionAddress], blockchain })

      const imageUrl = _.get(collectionsInfo, 'collections[0].image')

      if (!imageUrl?.length) rethrow('Unknown collection image')

      return imageUrl
    }
    catch (err) {
      throw fault('GET_ETH_COLLECTION_IMAGE_USE_RESERVOIR', undefined, err)
    }
  }
}
