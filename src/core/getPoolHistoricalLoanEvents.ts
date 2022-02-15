import Blockchain from '../entities/lib/Blockchain'
import failure from '../utils/failure'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export async function getPoolHistoricalLoanEvents({ blockchain, poolAddress }: Params) {
  switch (blockchain.network) {
  case 'ethereum': {
    try {
      const poolContract = getPoolContract({ blockchain, poolAddress })
      const events = await poolContract.getPastEvents('LoanInitiated', {
        fromBlock: 0,
        toBlock: 'latest',
      })

      return events
    }
    catch (err) {
      throw failure('FETCH_POOL_EVENTS_FAILURE', err)
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
