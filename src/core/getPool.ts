import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Pool from '../entities/Pool'
import { $ETH } from '../entities/Value'
import getPoolCapacity from './getPoolCapacity'
import getPoolCollection from './getPoolCollection'
import getPoolLoanOptions from './getPoolLoanOptions'
import getPoolUtilization from './getPoolUtilization'

type Params = {
  poolAddress: string
}

export default async function getPool({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<Pool> {
  switch (blockchain.network) {
  case 'ethereum': {
    const [
      { amount: utilizationEth },
      { amount: capacityEth },
    ] = await Promise.all([
      getPoolUtilization({ poolAddress }, blockchain),
      getPoolCapacity({ poolAddress }, blockchain),
    ])

    const collection = getPoolCollection({ poolAddress }, blockchain)
    const loanOptions = getPoolLoanOptions({ poolAddress }, blockchain)
    const valueLockedEth = capacityEth + utilizationEth

    return {
      address: poolAddress,
      collection,
      loanOptions,
      utilization: $ETH(utilizationEth),
      valueLocked: $ETH(valueLockedEth),
    }
  }
  default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
