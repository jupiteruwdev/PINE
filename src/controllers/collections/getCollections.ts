import { NFTCollectionModel } from '../../db'
import { mapCollection } from '../../db/adapters'
import { Blockchain, Collection } from '../../entities'

type Params = {
  blockchainFilter?: Blockchain.Filter
}

export default async function getCollections({
  blockchainFilter = { ethereum: Blockchain.Ethereum.Network.MAIN, solana: Blockchain.Solana.Network.MAINNET },
}: Params = {}): Promise<Collection[]> {
  let collections: Collection[] = []

  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

    const docs = await NFTCollectionModel.find({
      networkType: blockchain.network,
      networkId: blockchain.networkId,
    }).lean().exec()

    collections = [
      ...collections,
      ...docs.map(mapCollection),
    ]
  }

  return collections
}
