import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import appConf from '../../app.conf'
import { NFTCollectionModel, PoolModel } from '../../db'
import { Blockchain, CollectionMetadata } from '../../entities'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import { getEthNFTMetadata } from '../collaterals'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'

type Params = {
  blockchain: Blockchain
  collectionAddress?: string
  poolAddress?: string
  nftId?: string
}

export default async function getEthCollectionMetadata({
  blockchain,
  ...params
}: Params): Promise<CollectionMetadata> {
  try {
    logger.info(`Fetching metadata for colleciton using params <${JSON.stringify(params)}> on blockchain <${JSON.stringify(blockchain)}>...`)

    const dataSource = DataSource.compose(
      useDb({ blockchain, ...params }),
      useAlchemy({ blockchain, ...params }),
      useOpenSea({ blockchain, ...params }),
    )

    const metadata = await dataSource.apply(undefined)

    logger.info(`Fetching metadata for collection using params <${JSON.stringify(params)}> on blockchain <${JSON.stringify(blockchain)}>... OK`)
    logger.debug(JSON.stringify(metadata, undefined, 2))

    return metadata
  }
  catch (err) {
    logger.warn(`Fetching metadata for collection using params <${JSON.stringify(params)}> on blockchain <${JSON.stringify(blockchain)}>... WARN`)
    if (logger.isWarnEnabled() && !logger.silent) console.warn(err)

    return {}
  }
}

export function useDb({ blockchain, collectionAddress, poolAddress, nftId }: Params): DataSource<CollectionMetadata> {
  return async () => {
    logger.info('...using db to look up metadata for collection')

    if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    let docs

    if (poolAddress !== undefined) {
      const stages: PipelineStage[] = [{
        $addFields: {
          '_address': { $toLower: '$address' },
        },
      }, {
        $match: {
          'networkType': blockchain.network,
          'networkId': blockchain.networkId,
          '_address': poolAddress.toLowerCase(),
        },
      }, {
        $lookup: {
          from: 'nftCollections',
          localField: 'nftCollection',
          foreignField: '_id',
          as: 'collection',
        },
      }, {
        $unwind: '$collection',
      },
      ...collectionAddress === undefined ? [] : [{
        $addFields: {
          'collection._address': { $toLower: '$collection.address' },
        },
      }, {
        $match: {
          'collection._address': collectionAddress.toLowerCase(),
        },
      }], {
        $replaceRoot: {
          newRoot: '$collection',
        },
      }]

      docs = await PoolModel.aggregate(stages).exec()
    }
    else {
      if (collectionAddress === undefined) rethrow('Parameter `collectionAddress` is required when `poolAddress` is not provided')

      const stages: PipelineStage[] = [{
        $addFields: {
          '_address': { $toLower: '$address' },
        },
      }, {
        $match: {
          'networkType': blockchain.network,
          'networkId': blockchain.networkId,
          '_address': collectionAddress.toLowerCase(),
        },
      }]

      docs = await NFTCollectionModel.aggregate(stages).exec()
    }

    if (docs.length === 0) rethrow('No matching collection found in db')

    let metadata

    if (nftId !== undefined) {
      if (docs.length === 1 && docs[0].matcher === undefined) {
        metadata = {
          name: _.get(docs[0], 'displayName'),
          imageUrl: _.get(docs[0], 'imageUrl'),
          vendorIds: _.get(docs[0], 'vendorIds'),
          isSupported: true,
        }
      }
      else {
        const nftMetadata = await getEthNFTMetadata({ blockchain, collectionAddress: docs[0].address, nftId })
        const nft = { id: nftId, ...nftMetadata }

        const doc = _.find(docs, t => {
          if (!_.isString(t.matcher.regex) || !_.isString(t.matcher.fieldPath)) return false

          const regex = new RegExp(t.matcher.regex)
          if (regex.test(_.get(nft, t.matcher.fieldPath))) return true

          return false
        })

        metadata = {
          name: _.get(doc, 'displayName'),
          imageUrl: _.get(doc, 'imageUrl'),
          vendorIds: _.get(doc, 'vendorIds'),
          isSupported: true,
        }
      }
    }
    else if (docs.length === 1) {
      const doc = docs[0]

      metadata = {
        name: _.get(doc, 'displayName'),
        imageUrl: _.get(doc, 'imageUrl'),
        vendorIds: _.get(doc, 'vendorIds'),
        isSupported: true,
      }
    }
    else {
      rethrow('Unable to determine collection metadata due to more than 1 collection found')
    }

    return metadata
  }
}

export function useOpenSea({ blockchain, collectionAddress }: Params): DataSource<CollectionMetadata> {
  return async () => {
    logger.info('...using OpenSea to look up metadata')

    if (collectionAddress === undefined) rethrow('Collection address must be provided')
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
    logger.info('...using Alchemy to look up metadata')

    if (collectionAddress === undefined) rethrow('Collection address must be provided')
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
