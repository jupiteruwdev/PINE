import { findOneCollection } from '../../db'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import getLoanPosition from './getLoanPosition'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
}

export default async function getExistingLoan({ blockchain, collectionAddress, nftId }: Params): Promise<any> {
  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOneCollection({ address: collectionAddress, blockchain })
    if (!collection) throw fault('ERR_UNSUPPORTED_COLLECTION')
    const position = await getLoanPosition({ blockchain, collectionAddress, nftId, txSpeedBlocks: 0 })
    return {
      borrowedWei: position?.borrowed.amount.toString(),
      returnedWei: position?.returned.amount.toString(),
      pool: position?.poolAddress,
    }
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}