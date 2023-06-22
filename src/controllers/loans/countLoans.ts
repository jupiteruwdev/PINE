import { Blockchain } from '../../entities'
import { getOnChainLoans } from '../../subgraph'
import fault from '../../utils/fault'
import { getCollections } from '../collections'

type Params = {
  lenderAddresses?: string[]
  collectionAddresses?: string[]
  collectionNames?: string[]
  blockchainFilter: Blockchain.Filter
}

export default async function countLoans({
  blockchainFilter,
  lenderAddresses,
  collectionAddresses,
  collectionNames,
}: Params) {
  try {
    let allCollectionAddresses: string[] = []
    if (collectionNames !== undefined) {
      const collectionsByNames = await getCollections({ blockchainFilter, collectionNames })
      allCollectionAddresses = collectionsByNames.map(collection => collection.address.toLowerCase())
    }
    if (collectionAddresses !== undefined) {
      allCollectionAddresses = [
        ...allCollectionAddresses,
        ...collectionAddresses.map(address => address.toLowerCase()),
      ]
    }

    const onChainLoans = await getOnChainLoans({
      lenderAddresses,
      collectionAddresses: allCollectionAddresses,
    }, {
      networkId: Blockchain.parseBlockchain(blockchainFilter).networkId,
    })

    return onChainLoans?.length || 0
  }
  catch (err) {
    throw fault('ERR_COUNT_LOANS', undefined, err)
  }
}
