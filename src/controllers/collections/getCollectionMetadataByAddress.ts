import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getRequest from '../utils/getRequest'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

type CollectionMetaData = {
  vendorIds: Record<string, any>
  name: string
  image: string
}

async function getCollectionMetadata(url: string): Promise<CollectionMetaData> {
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
    image: collectionImage,
  }
}

export default async function getCollectionMetadataByAddress({ collectionAddress, blockchain }: Params): Promise<CollectionMetaData> {
  logger.info(`Fetching vendor ids for Ethereum collection <${collectionAddress}>...`)
  let collectionMetadata: CollectionMetaData

  switch (blockchain.networkId) {
  case Blockchain.Ethereum.Network.MAIN:
    collectionMetadata = await getCollectionMetadata(`https://api.opensea.io/api/v1/asset_contract/${collectionAddress}`)
    break
  case Blockchain.Ethereum.Network.RINKEBY:
    collectionMetadata = await getCollectionMetadata(`https://testnets-api.opensea.io/api/v1/asset_contract/${collectionAddress}`)
    break
  default:
    const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    logger.error(`Fetching vendor ids for Ethereum collection <${collectionAddress}>... ERR:`, err)
    throw err
  }

  return collectionMetadata
}
