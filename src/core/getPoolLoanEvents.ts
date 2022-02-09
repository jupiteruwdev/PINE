import Blockchain, { EthBlockchain } from '../entities/Blockchain'
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
    throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
