import _ from 'lodash'
import ERC721EnumerableABI from '../abis/ERC721Enumerable.json'
import { findAll as findAllCollections, findOne as findOneCollection } from '../db/collections'
import Blockchain from '../entities/Blockchain'
import Collection from '../entities/Collection'
import NFT from '../entities/NFT'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
import getNFTMetadata from './getNFTMetadata'

type Params = {
  /**
   * The blockchain of which the NFTs and the owner reside.
   */
  blockchain: Blockchain

  /**
   * If provided, the returned NFTs will only include those belonging to this collection.
   */
  collectionOrCollectionAddress?: Collection | string

  /**
   * The address of the owner of the NFTs to look up.
   */
  ownerAddress: string

  /**
   * Specifies if NFT metadata should be included, defaults to false. The operation is faster if
   * metadata is not fetched.
   */
  populateMetadata: boolean
}

/**
 * Fetches all supported NFTs owned by an address.
 *
 * @param params - See {@link Params}
 * @param blockchain - The blockchain of which the NFTs and owner reside.
 *
 * @returns An array of {@link NFT}.
 */
export default async function getNFTsByOwner({ blockchain, collectionOrCollectionAddress, ownerAddress, populateMetadata }: Params): Promise<NFT[]> {
  if (collectionOrCollectionAddress) {
    const collection = _.isString(collectionOrCollectionAddress) ? await findOneCollection({ address: collectionOrCollectionAddress, blockchain }) : collectionOrCollectionAddress

    if (!collection) return []

    switch (blockchain.network) {
    case 'ethereum': {
      const web3 = getEthWeb3(blockchain.networkId)
      const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collection.address)
      const count = _.toNumber(await contract.methods.balanceOf(ownerAddress).call())
      const nftIds = await Promise.all([...Array(count)].map((val, idx) => contract.methods.tokenOfOwnerByIndex(ownerAddress, idx).call()))
      const nfts: NFT[] = []

      // TODO: Optimize this. Currently doing this in series to avoid 429 for some API calls.
      for (const nftId of nftIds) {
        const metadata = populateMetadata === false ? {} : await getNFTMetadata({ blockchain, collectionAddress: collection.address, nftId })

        nfts.push({
          ...metadata,
          collection,
          id: nftId,
          ownerAddress,
        })
      }

      return nfts
    }
    default:
      throw failure('UNSUPPORTED_BLOCKCHAIN')
    }
  }
  else {
    const collections = await findAllCollections({ blockchains: { [blockchain.network]: blockchain.networkId } })
    const nftsPerCollection = await Promise.all(collections.map(collection => getNFTsByOwner({ blockchain, ownerAddress, collectionOrCollectionAddress: collection, populateMetadata })))

    return _.flatten(nftsPerCollection)
  }
}
