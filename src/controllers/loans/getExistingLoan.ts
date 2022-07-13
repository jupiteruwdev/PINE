import { findOneCollection } from '../../db'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import getLoan from './getLoan'

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
    const loan = await getLoan({ blockchain, collectionAddress, nftId, txSpeedBlocks: 0 })
    return {
      borrowedWei: loan?.borrowed.amount.toString(),
      returnedWei: loan?.returned?.amount.toString(),
      pool: loan?.poolAddress,
    }
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
