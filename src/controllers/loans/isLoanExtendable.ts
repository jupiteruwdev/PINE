import { getLoan } from '.'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import { searchPublishedPools } from '../pools'

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
  try {
    if (!Blockchain.isEVMChain(blockchain)) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    const loan = await getLoan({ blockchain, nftId, collectionAddress })
    if (loan === undefined) return false

    const isRepaid = loan.returned.amount.gte(loan.borrowed.amount)
    if (isRepaid) return false

    const pools = await searchPublishedPools({ blockchainFilter: Blockchain.parseFilter(blockchain), collectionAddress })
    const numPools = pools.filter(pool => pool.valueLocked.amount.gt(pool.utilization.amount ?? '0')).length

    if (numPools <= 0) return false

    return true
  }
  catch (err) {
    throw fault('ERR_IS_LOAN_EXTENDABLE', undefined, err)
  }
}
