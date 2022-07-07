import { Blockchain } from '../entities'
import fault from '../utils/fault'
import { getPoolContract } from './contracts'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export async function getPoolHistoricalLoanEvents({ blockchain, poolAddress }: Params) {
  switch (blockchain.network) {
  case 'ethereum': {
    const poolContract = await getPoolContract({ blockchain, poolAddress }).catch(err => { throw fault('ERR_FETCH_POOL_CONTRACT', undefined, err) })
    const events = await poolContract.getPastEvents('LoanInitiated', { fromBlock: 0, toBlock: 'latest' }).catch(err => { throw fault('ERR_FETCH_POOL_EVENTS', err) })
    return events
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
