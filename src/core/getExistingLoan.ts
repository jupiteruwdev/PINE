import { findOne as findOneCollection } from '../db/collections'
import { Blockchain, EthereumNetwork } from '../entities'
import { getOpenLoan } from '../subgraph/request'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getLoanPosition from './getLoanPosition'

type Params = {
  blockchain: Blockchain
  collectionId: string
  nftId: string
}

export default async function getExistingLoan({ blockchain, collectionId, nftId }: Params): Promise<any> {
  logger.info(`Checking loan extendability for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOneCollection({ id: collectionId, blockchain })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')
    if (blockchain.networkId === EthereumNetwork.RINKEBY) {
      const position = await getLoanPosition({ blockchain, collectionId, nftId, txSpeedBlocks: 0 })
      return {
        borrowedWei: position?.borrowed.amount.toString(),
        returnedWei: position?.returned.amount.toString(),
        pool: position?.poolAddress,
      }
    }
    const { loans } = await getOpenLoan({ id: `${collection.address}/${nftId}` })
    const existingLoan = loans.length > 0 ? loans[0] : undefined

    return existingLoan
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
