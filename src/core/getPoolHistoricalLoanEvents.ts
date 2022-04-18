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
    const poolContract = await getPoolContract({ blockchain, poolAddress }).catch(err => { throw failure('FETCH_POOL_CONTRACT', err) })
    const events = await poolContract.getPastEvents('LoanInitiated', { fromBlock: 0, toBlock: 'latest' }).catch(err => { throw failure('FETCH_POOL_EVENTS_FAILURE', err) })
    return events
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
