import _ from 'lodash'
import appConf from '../app.conf'
import { Blockchain, Value } from '../entities'
import failure from '../utils/failure'
import getPoolCapacity from './getPoolCapacity'
import getPoolContract from './getPoolContract'
import getPools from './getPools'

export default async function getFlashLoanSource({ blockchain, poolAddress }: { blockchain: Blockchain; poolAddress: string }): Promise<{ address: string; capacity: Value }> {
  const contract = await getPoolContract({ blockchain, poolAddress })
  const fundSource = await contract.methods._fundSource().call()
  const pools = (await getPools({ blockchainFilter: { ethereum: blockchain.networkId } }))
    .filter(e => e.version > 1 && e.address !== poolAddress)
  const poolsWithFundSource = (await Promise.all(pools.map(async e => {
    const tmpContract = await getPoolContract({ blockchain, poolAddress: e.address })
    const fundSource = await tmpContract.methods._fundSource().call()
    return {
      ...e,
      fundSource,
    }
  }))).filter(e => e.fundSource !== fundSource)
  if (poolsWithFundSource.length > 0) {
    const sortedPools = poolsWithFundSource.sort((a, b) => b.valueLocked.amount.minus(b.utilization.amount).minus(a.valueLocked.amount.minus(a.utilization.amount)).toNumber())
    return {
      address: sortedPools[0].address,
      capacity: Value.$ETH(sortedPools[0].valueLocked.amount.minus(sortedPools[0].utilization.amount)),
    }
  }
  else {
    const tmpContract = await getPoolContract({ blockchain, poolAddress: _.get(appConf.flashLoanSourceContractAddress, blockchain.networkId) })
    const fundSource2 = await tmpContract.methods._fundSource().call()
    if (fundSource === fundSource2) throw failure('NO_FLASHLOAN_POOL')
    const capacityEth = await getPoolCapacity({ blockchain, poolAddress: _.get(appConf.flashLoanSourceContractAddress, blockchain.networkId) })
    return {
      address: _.get(appConf.flashLoanSourceContractAddress, blockchain.networkId),
      capacity: capacityEth,
    }
  }
}
