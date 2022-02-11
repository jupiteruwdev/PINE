import { supportedCollections } from '../config/supportedCollecitons'
import { BlockchainDict } from '../entities/Blockchain'
import Collection from '../entities/Collection'
import { parseEthNetworkId } from '../utils/ethereum'
import { parseBlockchains } from '../utils/params'

/**
 * Fetches all NFT collections supported by the platform.
 *
 * @param blockchainFilter - Blockchains to filter for the returned pools. If unspecified, all
 *                           blockchains with default network ID will be used. Only blockchains that
 *                           appear in this dict will be included in the returned results.
 *
 * @returns An array of {@link Collection}.
 */
export default function getSupportedCollections(blockchainFilter: Partial<BlockchainDict> = parseBlockchains()) {
  const rawData = supportedCollections
  const ethBlockchain = blockchainFilter.ethereum

  let collections: Collection[] = []

  if (ethBlockchain) {
    const collectionIds = Object.keys(rawData).filter(collectionId => parseEthNetworkId(rawData[collectionId].networkId) === ethBlockchain.networkId)
    collections = collections.concat(collectionIds.map(collectionId => {
      const collectionData = rawData[collectionId]

      return {
        address: collectionData.address,
        blockchain: ethBlockchain,
        id: collectionId,
        imageUrl: collectionData.image_url,
        name: collectionData.display_name,
      }
    }))
  }

  return collections
}
