import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import failure from '../utils/failure'
import getPoolContract from './getPoolContract'

type Params = {
  poolAddress: string
}

export async function getPoolLoanEvents({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
  case 'ethereum': {
    const poolContract = getPoolContract({ poolAddress }, blockchain)
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
