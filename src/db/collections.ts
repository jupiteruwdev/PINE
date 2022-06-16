/**
 * @todo Use proper db.
 */

import _ from 'lodash'
import { Blockchain, BlockchainFilter, Collection, EthBlockchain, EthereumNetwork, SolanaNetwork } from '../entities'
import CollectionModel from '../models/collection'

type FindOneFilter = {
  address?: string
  blockchain?: Blockchain
  id?: string
  poolAddress?: string
}

type FindAllFilter = {
  blockchainFilter?: BlockchainFilter
}

export function mapCollection(data: Record<string, any>): Collection {
  const address = _.get(data, 'address')
  const networkType = _.get(data, 'networkType')
  const networkId = _.toString(_.get(data, 'networkId'))
  const id = _.get(data, 'id')
  const imageUrl = _.get(data, 'imageUrl')
  const name = _.get(data, 'displayName')

  if (!_.isString(address)) throw TypeError('Failed to map key "address"')
  if (!_.isString(id)) throw TypeError('Failed to map key "id"')
  if (!_.isString(name)) throw TypeError('Failed to map key "name"')
  if (!networkType) throw TypeError('Failed to map key "blockchain"')
  if (!networkId) throw TypeError('Failed to map key "blockchain"')

  return {
    address,
    blockchain: { network: networkType, networkId },
    id,
    imageUrl,
    name,
  }
}

export function getCollectionVendorId(data: Record<string, any>): string {
  const vendorIds = _.get(data, 'vendorIds')
  return `${_.keys(vendorIds)[0]}:${_.values(vendorIds)[0]}`
}

export async function findOneOrigin({ address, blockchain = EthBlockchain(), id, poolAddress }: FindOneFilter): Promise<Record<string, any> | undefined> {
  const collection = await CollectionModel.findOne({
    address,
    networkType: blockchain.network,
    networkId: blockchain.networkId,
  }).lean().exec()
  if (collection) {
    if (poolAddress !== undefined && _.get(collection, 'lendingPools').some((e: any) => e.address !== poolAddress)) return undefined
    if (id !== undefined) {
      const matches = id.match(/(.*):(.*)/)
      const venue = matches?.[1] ?? ''
      const name = matches?.[2]
      if (_.get(collection, ['vendorIds', venue]) !== name) return undefined
    }

    return collection
  }
}

/**
 * Finds one supported collection on the platform based on the specified filter.
 *
 * @param filter - See {@link FindOneFilter}.
 *
 * @returns The collection if there is a match, `undefined` otherwise.
 */
export async function findOne({ address, blockchain = EthBlockchain(), id, poolAddress }: FindOneFilter): Promise<Collection | undefined> {
  const collection = await findOneOrigin({ address, blockchain, id, poolAddress })
  if (collection) {

    return mapCollection({
      ...collection,
      id: getCollectionVendorId(collection),
    })
  }
}

export async function findAllOrigin({ blockchainFilter = { ethereum: EthereumNetwork.MAIN, solana: SolanaNetwork.MAINNET } }: FindAllFilter = {}): Promise<Record<string, any>[]> {
  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = EthBlockchain(blockchainFilter.ethereum)

    const collectionData = await CollectionModel.find({
      networkType: blockchain.network,
      networkId: blockchain.networkId,
    }).lean().exec()

    return collectionData
  }

  return []
}

/**
 * Finds all supported collections on the platform. If no filters are provided, all collection will
 * be returned in the default networks of all blockchains.
 *
 * @param filter - See {@link FindAllFilter}.
 *
 * @returns Array of collections.
 */
export async function findAll({ blockchainFilter = { ethereum: EthereumNetwork.MAIN, solana: SolanaNetwork.MAINNET } }: FindAllFilter = {}): Promise<Collection[]> {
  const collections: Collection[] = []
  const collectionData = await findAllOrigin({ blockchainFilter })

  collectionData.forEach(collection => {
    collections.push(mapCollection({
      ...collection,
      id: getCollectionVendorId(collection),
    }))
  })

  return collections
}
