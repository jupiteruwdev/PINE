import { Blockchain, NFT, Collection } from '../entities'
import failure from '../utils/failure'
import getEthMainnetNFTsByOwner from './getEthMainnetNFTsByOwner'
import getEthTestnetNFTsByOwner from './getEthTestnetNFTsByOwner'
import getSolNFTsByOwner from './getSolNFTsByOwner'

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

  /**
   * @todo Remove this hack.
   */
  index?: number
}

function delay(t: number, val?: any) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(val)
    }, t)
  })
}

/**
 * Fetches all supported NFTs owned by an address.
 *
 * @param params - See {@link Params}
 *
 * @returns An array of {@link NFT}.
 */
export default async function getNFTsByOwner({
  blockchain,
  collectionOrCollectionAddress,
  ownerAddress,
  populateMetadata,
  index = 0,
}: Params): Promise<NFT[]> {
  switch (blockchain.network) {
  case 'ethereum':
    if (blockchain.networkId === Blockchain.Ethereum.Network.MAIN) {
      // TODO: This is bad
      await delay(100 * index)
      return getEthMainnetNFTsByOwner({ collectionOrCollectionAddress, ownerAddress, populateMetadata })
    }
    else {
      return getEthTestnetNFTsByOwner({ blockchain, collectionOrCollectionAddress, ownerAddress, populateMetadata })
    }
  case 'solana':
    return getSolNFTsByOwner({ blockchain, collectionOrCollectionAddress, ownerAddress, populateMetadata })
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
