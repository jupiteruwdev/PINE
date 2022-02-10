import { supportedCollections } from '../config/supportedCollecitons'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Collection from '../entities/Collection'
import { parseEthNetworkId } from '../utils/ethereum'

type Params = {
  poolAddress: string
}

export default function getPoolCollection({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  const rawData = supportedCollections

  switch (blockchain.network) {
  case 'ethereum': {
    const collectionIds = Object.keys(rawData).filter(collectionId => parseEthNetworkId(rawData[collectionId].networkId) === blockchain.networkId)

    for (const collectionId of collectionIds) {
      const collectionData = rawData[collectionId]

      if (poolAddress === collectionData.lendingPool.address) {
        const collection: Collection = {
          address: collectionData.address,
          blockchain,
          id: collectionId,
          imageUrl: collectionData.image_url,
          name: collectionData.display_name,
        }

        return collection
      }
    }

    break
  }
  }

  return undefined
}
