import Blockchain from '../entities/Blockchain'
import failure from '../utils/failure'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export async function getPoolLoanEvents({ blockchain, poolAddress }: Params) {
  switch (blockchain.network) {
  case 'ethereum': {
    const poolContract = getPoolContract({ blockchain, poolAddress })
    const events = await poolContract.getPastEvents('LoanInitiated', {
      fromBlock: 0,
      toBlock: 'latest',
    })

    return events
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
