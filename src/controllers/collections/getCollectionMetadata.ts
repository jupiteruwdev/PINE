import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, CollectionMetadata } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getRequest from '../utils/getRequest'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

async function getCollectionMetadata(url: string): Promise<CollectionMetadata> {
  const apiKey = appConf.openseaAPIKey
  const collectionData = await getRequest(url, {
    headers: {
      'X-API-KEY': apiKey,
    },
  })
  const collectionSlug = _.get(collectionData, 'collection.slug')
  const collectionName = _.get(collectionData, 'collection.name')
  const collectionImage = _.get(collectionData, 'collection.image_url')
  return {
    vendorIds: {
      opensea: collectionSlug,
    },
    name: collectionName,
    imageUrl: collectionImage,
  }
}

export default async function getCollectionMetadataByAddress({ collectionAddress, blockchain }: Params): Promise<CollectionMetadata> {
  logger.info(`Fetching metadata for collection <${collectionAddress}>...`)
  let collectionMetadata: CollectionMetadata

  switch (blockchain.network) {
  case 'ethereum':
    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      collectionMetadata = await getCollectionMetadata(`https://api.opensea.io/api/v1/asset_contract/${collectionAddress}`)
      break
    case Blockchain.Ethereum.Network.RINKEBY:
      collectionMetadata = await getCollectionMetadata(`https://testnets-api.opensea.io/api/v1/asset_contract/${collectionAddress}`)
      break
    default:
      const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
      logger.error(`Fetching metadata fro collection <${collectionAddress}>... ERR:`, err)
      throw err
    }
    break
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }

  return collectionMetadata
}
