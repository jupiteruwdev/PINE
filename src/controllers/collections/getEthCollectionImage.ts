import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getRedisCache, setRedisCache } from '../../utils/redis'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'

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
        useAlchemy({ blockchain, ...params }),
      )
      break
    case 'polygon':
    case 'arbitrum':
      imageUrl = await DataSource.fetch(
        useAlchemy({ blockchain, ...params }),
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

export function useAlchemy({ blockchain, collectionAddress }: Params): DataSource<string> {
  return async () => {
    try {
      logger.info(`...using Alchemy to look up imageUrl for collection <${collectionAddress}>`)

      if (collectionAddress === undefined) rethrow('Collection address must be provided')
      if (!Blockchain.isEVMChain(blockchain)) rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

      const apiMainUrl = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain <${JSON.stringify(blockchain)}>`)

      const res = await getRequest(`${apiMainUrl}/getContractMetadata`, {
        params: {
          contractAddress: collectionAddress,
        },
      }).catch(err => rethrow(`Failed to fetch imageUrl from Alchemy for collection <${collectionAddress}>: ${err}`))

      const imageUrl = ['contractMetadata.openSea.imageUrl', 'contractMetadata.looksrare.imageUrl'].reduceRight((prev, curr) => !_.isEmpty(prev) ? prev : _.get(res, curr), '') // Alchemy API does not provide collection image

      if (!imageUrl?.length) rethrow('Unknown collection image')

      return imageUrl
    }
    catch (err) {
      throw fault('GET_ETH_COLLECTION_IMAGE_USE_ALCHEMY', undefined, err)
    }
  }
}
