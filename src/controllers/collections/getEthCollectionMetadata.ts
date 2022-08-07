import _ from 'lodash'
import appConf from '../../app.conf'
import { NFTCollectionModel } from '../../db'
import { Blockchain, CollectionMetadata } from '../../entities'
import composeDataSources, { DataSource } from '../../utils/composeDataSources'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import getRequest from '../utils/getRequest'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

export default async function getEthCollectionMetadata({
  blockchain,
  collectionAddress,
}: Params): Promise<Partial<CollectionMetadata>> {
  try {
    logger.info(`Fetching metadata for collection <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>...`)

    const dataSource = composeDataSources(
      useDb({ blockchain, collectionAddress }),
      useOpenSea({ blockchain, collectionAddress }),
    )

    const metadata = await dataSource.apply(undefined)

    logger.info(`Fetching metadata for collection <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... OK`)
    logger.debug(JSON.stringify(metadata, undefined, 2))

    return metadata
  }
  catch (err) {
    logger.warn(`Fetching metadata for collection <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... WARN`)
    if (logger.isWarnEnabled() && !logger.silent) console.warn(err)

    return {}
  }
}

export function useDb({ blockchain, collectionAddress }: Params): DataSource<Partial<CollectionMetadata>> {
  return async () => {
    logger.info(`...using db to look up metadata for collection <${collectionAddress}>`)

    if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const collection = await NFTCollectionModel.findOne({
      networkType: blockchain.network,
      networkId: blockchain.networkId,
      address: collectionAddress,
    }).lean()

    const metadata = {
      name: collection?.displayName,
      imageUrl: collection?.imageUrl,
      vendorIds: collection?.vendorIds,
    }

    return metadata
  }
}

export function useOpenSea({ blockchain, collectionAddress }: Params): DataSource<Partial<CollectionMetadata>> {
  return async () => {
    logger.info(`...using OpenSea to look up metadata for collection <${collectionAddress}>`)

    if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const apiKey = appConf.openseaAPIKey ?? rethrow('Missing OpenSea API key')
    let res

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      res = await getRequest(`https://api.opensea.io/api/v1/asset_contract/${collectionAddress}`, { headers: { 'X-API-KEY': apiKey } })
      break
    case Blockchain.Ethereum.Network.RINKEBY:
      res = await getRequest(`https://testnets-api.opensea.io/api/v1/asset_contract/${collectionAddress}`, { headers: { 'X-API-KEY': apiKey } })
      break
    }

    if (res === undefined) rethrow(`Unexpected payload when looking up colleciton metadata from OpenSea`)

    const name = _.get(res, 'collection.name')
    const imageUrl = _.get(res, 'collection.image_url')
    const vendorId = _.get(res, 'collection.slug')

    const metadata = {
      name,
      imageUrl,
      vendorIds: {
        opensea: vendorId,
      },
    }

    return metadata
  }
}
