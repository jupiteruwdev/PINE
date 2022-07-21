/**
 * @todo Use proper db.
 */

import _ from 'lodash'
import { getNFTMetadata } from '../../controllers'
import { Blockchain, Collection, NFT, NFTMetadata } from '../../entities'
import fault from '../../utils/fault'
import { mapCollection } from '../adapters'
import { NFTCollectionModel } from '../models'

type FindOneFilter = {
  address?: string
  blockchain?: Blockchain
  poolAddress?: string
  nftId?: string
}

type FindAllFilter = {
  blockchainFilter?: Blockchain.Filter
}

export async function findOneCollection({ address, blockchain = Blockchain.Ethereum(), poolAddress, nftId }: FindOneFilter): Promise<Collection | undefined> {
  const query: Record<string, any> = {
    networkType: blockchain.network,
    networkId: blockchain.networkId,
  }
  if (address !== undefined) {
    query['address'] = address
  }
  const collections = await NFTCollectionModel.find(query).lean().exec()
  if (!nftId) {
    if (collections[0]) {
      if (poolAddress !== undefined && _.get(collections[0], 'lendingPools').some((e: any) => e.address !== poolAddress)) return undefined

      return mapCollection(collections[0])
    }
  }
  else {
    const filteredCollections = (await Promise.all(collections.map(async col => {
      if (!address) fault('ERR_INVALID_PARAMS', 'NFT ID must be used with collection address')
      if (!col.matcher) return col
      const nftMetadata: NFTMetadata = await getNFTMetadata({ blockchain, collectionAddress: address ?? '', nftId })
      const nft: Partial<NFT> = {
        id: nftId,
        ...nftMetadata,
      }
      const regex = new RegExp(String(col.matcher?.regex))
      if (regex.test(_.get(nft, String(col.matcher?.fieldPath)))) return col
      else return undefined
    }))).filter(e => e)

    if (filteredCollections.length > 0 && filteredCollections[0] !== undefined) {
      if (poolAddress !== undefined && _.get(filteredCollections[0], 'lendingPools').some((e: any) => e.address !== poolAddress)) return undefined

      return mapCollection(filteredCollections[0])
    }

  }
}

export async function findAllCollections({ blockchainFilter = { ethereum: Blockchain.Ethereum.Network.MAIN, solana: Blockchain.Solana.Network.MAINNET } }: FindAllFilter = {}): Promise<Collection[]> {
  const collections: Collection[] = []

  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

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
