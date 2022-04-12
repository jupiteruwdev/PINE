import Blockchain from '../entities/lib/Blockchain'
import failure from '../utils/failure'
import getPoolContract from './getPoolContract'
import getPools from './getPools'
import getPoolCapacity from './getPoolCapacity'
import Value, { $ETH } from '../entities/lib/Value'

const flashLoanSourceContractAddresses: { [key: number]: any } = {
  4: '0x8eE816b1B3B3E5F2dE1d8344A7Dc69AA16074314',
  1: '0x63ca18f8cb75e28f94cf81901caf1e39657ea256',
}

export default async function getFlashLoanSourceContractAddress({ blockchain, poolAddress, flashLoanAmount }: { blockchain: Blockchain; poolAddress: string; flashLoanAmount: string }): Promise<{ address: string; maxFlashLoanValue: Value }> {
  const contract = await getPoolContract({ blockchain, poolAddress })
  const fundSource = await contract.methods._fundSource().call()
  const pools = (await getPools({ blockchains: { ethereum: blockchain.networkId } }))
    .filter(e => e.version > 1 && e.address !== poolAddress)
  const poolsWithFundsource = (await Promise.all(pools.map(async e => {
    const tmpContract = await getPoolContract({ blockchain, poolAddress: e.address })
    const fundSource = await tmpContract.methods._fundSource().call()
    return {
      ...e,
      fundSource,
    }
  }))).filter(e => e.fundSource !== fundSource)
  if (poolsWithFundsource.length > 0) {
    const sortedPools = poolsWithFundsource.sort((a, b) => b.valueLocked.amount.minus(b.utilization.amount).minus(a.valueLocked.amount.minus(a.utilization.amount)).toNumber())
    return {
      address: sortedPools[0].address,
      maxFlashLoanValue: $ETH(sortedPools[0].valueLocked.amount.minus(sortedPools[0].utilization.amount)),
    }
  }
  else {
    const tmpContract = await getPoolContract({ blockchain, poolAddress: flashLoanSourceContractAddresses[Number(blockchain.networkId)] })
    const fundSource2 = await tmpContract.methods._fundSource().call()
    if (fundSource === fundSource2) throw failure('NO_FLASHLOAN_POOL')
    const capacityEth = await getPoolCapacity({ blockchain, poolAddress: flashLoanSourceContractAddresses[Number(blockchain.networkId)] })
    return {
      address: flashLoanSourceContractAddresses[Number(blockchain.networkId)],
      maxFlashLoanValue: capacityEth,
    }
  }
}
