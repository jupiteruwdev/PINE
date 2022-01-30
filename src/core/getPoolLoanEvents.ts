import { Web3Options } from '../utils/ethereum'
import getPoolContract from './getPoolContract'

export async function getPoolLoanEvents(poolAddress: string, options: Web3Options = {}) {
  const poolContract = getPoolContract(poolAddress, options)
  const events = await poolContract.getPastEvents('LoanInitiated', {
    fromBlock: 0,
    toBlock: 'latest',
  })

  return events
}
