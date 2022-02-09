import _ from 'lodash'
import appConf from '../app.conf'
import { EthBlockchain } from '../entities/Blockchain'
import GlobalStats from '../entities/GlobalStats'
import { $USD } from '../entities/Value'
import { getEthValueUSD } from '../utils/ethereum'
import logger from '../utils/logger'
import getCollateralOutstanding from './getCollateralOutstanding'
import getPoolCapacity from './getPoolCapacity'
import getPoolCollaterals from './getPoolCollaterals'
import getPoolUtilization from './getPoolUtillization'

export default async function getGlobalStats() {
  logger.info('Fetching global stats...')

  const ethBlockchain = EthBlockchain()
  const poolAddresses = appConf.v1Pools

  const [
    ethValueUSD,
    capacityPerPool,
    lentPerPool,
    collateralsPerPool,
  ] = await Promise.all([
    getEthValueUSD(),
    Promise.all(poolAddresses.map(poolAddress => getPoolCapacity({ poolAddress }, ethBlockchain))),
    Promise.all(poolAddresses.map(poolAddress => getPoolUtilization({ poolAddress }, ethBlockchain))),
    Promise.all(poolAddresses.map(poolAddress => getPoolCollaterals({ poolAddress }, ethBlockchain))),
  ])

  let totalUtilizationEth = 0

  for (let i = 0, n = poolAddresses.length; i < n; i++) {
    const poolAddress = poolAddresses[i]
    const collaterals = collateralsPerPool[i]
    const utilizationPerCollateral = await Promise.all(collaterals.map(nftId => getCollateralOutstanding({ nftId, poolAddress }, ethBlockchain)))

    totalUtilizationEth += _.sumBy(utilizationPerCollateral, t => t.amount)
  }

  const totalCapacityUSD = _.sumBy(capacityPerPool, t => t.amount) * ethValueUSD.amount
  const totalLentUSD = _.sumBy(lentPerPool, t => t.amount) * ethValueUSD.amount
  const totalUtilizationUSD = totalUtilizationEth * ethValueUSD.amount
  const tvlUSD =  totalUtilizationUSD + totalCapacityUSD

  const globalStats: GlobalStats = {
    'capacity': $USD(totalCapacityUSD),
    'total_lent_historical': $USD(totalLentUSD),
    'total_value_locked': $USD(tvlUSD),
    'utilization_ratio': totalUtilizationUSD / tvlUSD,
    'utilization': $USD(totalUtilizationUSD),
  }

  logger.info('Fetching global stats... OK', globalStats)

  return globalStats
}
