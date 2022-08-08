import _ from 'lodash'
import appConf from '../../app.conf'
import { NFTCollectionModel } from '../../db'
import { Blockchain, CollectionMetadata } from '../../entities'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

export default async function getEthCollectionMetadata({
  blockchain,
  collectionAddress,
}: Params): Promise<CollectionMetadata> {
  try {
    logger.info(`Fetching metadata for collection <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>...`)

    const dataSource = DataSource.compose(
      useDb({ blockchain, collectionAddress }),
      useAlchemy({ blockchain, collectionAddress }),
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

export function useDb({ blockchain, collectionAddress }: Params): DataSource<CollectionMetadata> {
  return async () => {
    logger.info(`...using db to look up metadata for collection <${collectionAddress}>`)

    if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const pipeline = [{
      $addFields: {
        '_address': {
          $toLower: '$address',
        },
      },
    }, {
      $match: {
        'networkType': blockchain.network,
        'networkId': parseInt(blockchain.networkId, 10),
        ...collectionAddress === undefined ? {} : { _address: collectionAddress.toLowerCase() },
      },
    }]

    // TODO: Support nftId
    const collections = await NFTCollectionModel.aggregate(pipeline).exec()
    const collection = collections[0]

    const metadata = {
      name: collection?.displayName ?? undefined,
      imageUrl: collection?.imageUrl ?? undefined,
      vendorIds: collection?.vendorIds ?? undefined,
      // TODO: Using this to indicate if the collection is supported, kinda hacky, remove when possible
      ...!collection ? {} : { isSupported: true },
    }

    return metadata
  }
}

export function useOpenSea({ blockchain, collectionAddress }: Params): DataSource<CollectionMetadata> {
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

    if (res === undefined) rethrow('Unexpected payload when looking up colleciton metadata from OpenSea')

    const name = _.get(res, 'collection.name') ?? undefined
    const imageUrl = _.get(res, 'collection.image_url') ?? undefined
    const vendorId = _.get(res, 'collection.slug') ?? undefined

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

export function useAlchemy({ blockchain, collectionAddress }: Params): DataSource<CollectionMetadata> {
  return async () => {
    logger.info(`...using Alchemy to look up metadata for collection <${collectionAddress}>`)

    if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const apiHost = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain <${JSON.stringify(blockchain)}>`)
    const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

    const res = await getRequest(`${apiHost}${apiKey}/getContractMetadata`, {
      params: {
        contractAddress: collectionAddress,
      },
    })

    const name = _.get(res, 'contractMetadata.name') ?? undefined
    const imageUrl = undefined // Alchemy API does not provide collection image

    return {
      name,
      imageUrl,
    }
  }
}
