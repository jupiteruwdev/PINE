import { Blockchain } from '../../entities'
import { getOnChainLoans } from '../../subgraph'
import { getCollections } from '../collections'

type Params = {
  lenderAddresses?: string[]
  collectionAddresses?: string[]
  collectionNames?: string[]
  blockchain: Blockchain
}

export default async function countLoans({
  blockchain,
  lenderAddresses,
  collectionAddresses,
  collectionNames,
}: Params) {
  let allCollectionAddresses: string[] = []
  if (collectionNames !== undefined) {
    const collectionsByNames = await getCollections({ blockchainFilter: {
      ethereum: blockchain.networkId,
    }, collectionNames })
    allCollectionAddresses = collectionsByNames.map(collection => collection.address.toLowerCase())
  }
  if (collectionAddresses !== undefined) {
    allCollectionAddresses = [
      ...allCollectionAddresses,
      ...collectionAddresses.map(address => address.toLowerCase()),
    ]
  }

  const onChainLoans = await getOnChainLoans({
    lenderAddresses: lenderAddresses?.map(address => address.toLowerCase()),
    collectionAddresses: allCollectionAddresses,
  }, {
    networkId: blockchain.networkId,
  })

  return onChainLoans?.length || 0
}
