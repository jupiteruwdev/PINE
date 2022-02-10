import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Collection from '../entities/Collection'
import getSupportedCollections from './getSupportedCollections'

type Params = {
  collectionAddress: string
}

export default function getSupportedCollectionByAddress({ collectionAddress }: Params, blockchain: Blockchain = EthBlockchain()): Collection | undefined {
  const collections = getSupportedCollections([blockchain])
  const collection = collections.find(t => t.address === collectionAddress)

  return collection
}
