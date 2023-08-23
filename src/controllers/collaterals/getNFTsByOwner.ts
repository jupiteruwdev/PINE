import { Blockchain, NFT } from '../../entities'
import fault from '../../utils/fault'
import getEthNFTsByOwner from './getEthNFTsByOwner'

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
  try {
    if (!Blockchain.isEVMChain(blockchain)) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    return getEthNFTsByOwner({ blockchain, ownerAddress, populateMetadata, collectionAddress })
  }
  catch (err) {
    throw fault('ERR_GET_NFTS_BY_OWNER', undefined, err)
  }
}
