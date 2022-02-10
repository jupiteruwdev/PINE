import { supportedCollections } from '../config/supportedCollecitons'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Collection from '../entities/Collection'
import { parseEthNetworkId } from '../utils/ethereum'

/**
 * Fetches all NFT collections supported by the platform.
 *
 * @param blockchains - Blockchains to filter for the returned collections. If unspecified, all
 *                      blockchains with default network ID will be used. Otherwise pass in an array
 *                      of {@link Blockchain} to only include collections in those blockchains.
 *
 * @returns An array of {@link Collection}.
 */
export default function getSupportedCollections(blockchains?: Blockchain[]) {
  const rawData = supportedCollections
  const ethBlockchain = blockchains === undefined ? EthBlockchain() : blockchains.find(blockchain => blockchain.network === 'ethereum')

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
