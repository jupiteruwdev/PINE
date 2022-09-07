import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Value } from '../../entities'
import fault from '../../utils/fault'
import { getPoolContract } from '../contracts'
import { getPool, getPoolCapacity, searchPublishedPools } from '../pools'

export default async function getFlashLoanSource({ poolAddress, blockchain }: { poolAddress: string; blockchain: Blockchain }): Promise<{ address: string; capacity: Value }> {
  const pool = await getPool({ address: poolAddress, blockchain, includeStats: false })
  const fundSource = pool.fundSource
  const pools = (await searchPublishedPools({ blockchainFilter: { ethereum: blockchain.networkId }, includeStats: true }))
    .filter(e => e.version > 1 && e.address !== poolAddress)
  const poolsWithFundSource = pools.filter(e => e.fundSource !== fundSource)
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
    const tokenAddress = await tmpContract.methods._supportedCurrency().call()
    if (fundSource === fundSource2) throw fault('ERR_NO_FLASHLOAN_POOL')
    const capacityEth = await getPoolCapacity({
      blockchain,
      poolAddress: _.get(appConf.flashLoanSourceContractAddress, blockchain.networkId),
      fundSource: fundSource2,
      tokenAddress,
    })
    return {
      address: _.get(appConf.flashLoanSourceContractAddress, blockchain.networkId),
      capacity: capacityEth,
    }
  }
}
