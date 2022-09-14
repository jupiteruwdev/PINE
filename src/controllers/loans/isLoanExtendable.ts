import { getLoan } from '.'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import { countPools } from '../pools'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
}

export default async function isLoanExtendable({
  blockchain,
  collectionAddress,
  nftId,
}: Params): Promise<boolean> {
  switch (blockchain.network) {
  case 'ethereum': {
    const loan = await getLoan({ blockchain, nftId, collectionAddress })
    if (loan === undefined) return false

    const isRepaid = loan.returned.amount.gte(loan.borrowed.amount)
    if (isRepaid) return false

    const numPools = await countPools({ blockchainFilter: { [blockchain.network]: blockchain.networkId }, collectionAddress })
    if (numPools <= 0) return false

    return true
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
