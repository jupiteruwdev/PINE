import { Blockchain, NFT } from '../../entities'
import fault from '../../utils/fault'
import getEthNFTsByOwner from './getEthNFTsByOwner'
import getSolNFTsByOwner from './getSolNFTsByOwner'

type Params = {
  /**
   * The blockchain of which the NFTs and the owner reside.
   */
  blockchain: Blockchain

  /**
   * The address of the owner of the NFTs to look up.
   */
  ownerAddress: string

  /**
   * Specifies if NFT metadata should be included, defaults to false. The operation is faster if
   * metadata is not fetched.
   */
  populateMetadata?: boolean

  /**
   * The address of the collection for NFTs to look up
   */
  collectionAddress?: string
}

/**
 * Fetches all supported NFTs owned by an address.
 *
 * @param params - See {@link Params}
 *
 * @returns An array of {@link NFT}.
 */
export default async function getNFTsByOwner({ blockchain, ownerAddress, populateMetadata = false, collectionAddress }: Params): Promise<NFT[]> {
  switch (blockchain.network) {
  case 'ethereum':
  case 'polygon':
    return getEthNFTsByOwner({ blockchain, ownerAddress, populateMetadata, collectionAddress })
  case 'solana':
    return getSolNFTsByOwner({ blockchain, ownerAddress, populateMetadata, collectionAddress })
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
