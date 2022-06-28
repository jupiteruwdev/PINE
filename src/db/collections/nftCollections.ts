/**
 * @todo Use proper db.
 */

import _ from 'lodash'
import { Blockchain, BlockchainFilter, Collection, EthBlockchain, EthereumNetwork, SolanaNetwork } from '../../entities'
import { mapCollection } from '../adapters'
import { NFTCollectionModel } from '../models'

type FindOneFilter = {
  address?: string
  blockchain?: Blockchain
  id?: string
  poolAddress?: string
}

type FindAllFilter = {
  blockchainFilter?: BlockchainFilter
}

export async function findOneCollection({ address, blockchain = EthBlockchain(), id, poolAddress }: FindOneFilter): Promise<Collection | undefined> {
  const query: Record<string, any> = {
    networkType: blockchain.network,
    networkId: blockchain.networkId,
  }
  if (address !== undefined) {
    query['address'] = address
  }
  if (id !== undefined) {
    const matches = id.match(/(.*):(.*)/)
    const venue = matches?.[1] ?? ''
    const collectionId = matches?.[2] ?? ''
    query['vendorIds'] = {
      [venue]: collectionId,
    }
  }

  const collection = await NFTCollectionModel.findOne(query).lean().exec()
  if (collection) {
    if (poolAddress !== undefined && _.get(collection, 'lendingPools').some((e: any) => e.address !== poolAddress)) return undefined
    if (id !== undefined) {
      const matches = id.match(/(.*):(.*)/)
      const venue = matches?.[1] ?? ''
      const name = matches?.[2]
      if (_.get(collection, ['vendorIds', venue]) !== name) return undefined
    }

    return mapCollection(collection)
  }
}

export async function findAllCollections({ blockchainFilter = { ethereum: EthereumNetwork.MAIN, solana: SolanaNetwork.MAINNET } }: FindAllFilter = {}): Promise<Collection[]> {
  const collections: Collection[] = []

  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = EthBlockchain(blockchainFilter.ethereum)

    const collectionData = await NFTCollectionModel.find({
      networkType: blockchain.network,
      networkId: blockchain.networkId,
    }).lean().exec()

    collectionData.forEach(collection => {
      collections.push(mapCollection(collection))
    })
  }

  return collections
}
