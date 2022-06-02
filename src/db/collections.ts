/**
 * @todo Use proper db.
 */

import _ from 'lodash'
import { supportedCollections } from '../config/supportedCollections'
import Blockchain, { AnyBlockchain, EthBlockchain } from '../entities/lib/Blockchain'
import Collection from '../entities/lib/Collection'

type FindOneFilter = {
  address?: string
  blockchain?: Blockchain
  id?: string
  poolAddress?: string
}

type FindAllFilter = {
  blockchains?: { [K in AnyBlockchain]?: string }
}

export function mapCollection(data: Record<string, any>): Collection {
  const address = _.get(data, 'address')
  const networkType = _.get(data, 'networkType')
  const networkId = _.toString(_.get(data, 'networkId'))
  const id = _.get(data, 'id')
  const imageUrl = _.get(data, 'image_url')
  const name = _.get(data, 'display_name')

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

/**
 * Finds one supported collection on the platform based on the specified filter.
 *
 * @param filter - See {@link FindOneFilter}.
 *
 * @returns The collection if there is a match, `undefined` otherwise.
 */
export async function findOne({ address, blockchain = EthBlockchain(), id, poolAddress }: FindOneFilter): Promise<Collection | undefined> {
  const rawData = supportedCollections
  const matchedId = _.findKey(rawData, (val, key) => {
    if (id !== undefined && id !== key) return false
    if (address !== undefined && _.get(val, 'address')?.toLowerCase() !== address.toLowerCase()) return false
    if (_.get(val, 'networkType') !== blockchain.network) return false
    if (_.toString(_.get(val, 'networkId')) !== blockchain.networkId) return false
    if (poolAddress !== undefined && !_.get(val, 'lendingPools').some((e: any) => e.address !== poolAddress)) return false
    return true
  })

  if (!matchedId) return undefined

  const collectionData = rawData[matchedId]

  return mapCollection({
    ...collectionData,
    id: matchedId,
  })
}

/**
 * Finds all supported collections on the platform. If no filters are provided, all collection will
 * be returned in the default networks of all blockchains.
 *
 * @param filter - See {@link FindAllFilter}.
 *
 * @returns Array of collections.
 */
export async function findAll({ blockchains }: FindAllFilter = {}): Promise<Collection[]> {
  const rawData = supportedCollections
  const ethBlockchain = blockchains ? (blockchains.ethereum ? EthBlockchain(blockchains.ethereum) : undefined) : EthBlockchain()

  const collections: Collection[] = []

  if (ethBlockchain) {
    for (const key in rawData) {
      if (!rawData.hasOwnProperty(key)) continue

      const data = rawData[key]

      if (_.get(data, 'networkType') !== ethBlockchain.network) continue
      if (_.toString(_.get(data, 'networkId')) !== ethBlockchain.networkId) continue

      collections.push(mapCollection({
        ...data,
        id: key,
      }))
    }
  }

  return collections
}
