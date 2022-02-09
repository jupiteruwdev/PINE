import _ from 'lodash'
import appConf from '../app.conf'
import { EthBlockchain } from '../entities/Blockchain'
import GlobalStats from '../entities/GlobalStats'
import { getEthBlockNumber, getEthPriceUSD } from '../utils/ethereum'
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
    blockNumber,
    ethPriceUSD,
    capacityPerPool,
    lentPerPool,
    collateralsPerPool,
  ] = await Promise.all([
    getEthBlockNumber(),
    getEthPriceUSD(),
    Promise.all(poolAddresses.map(poolAddress => getPoolCapacity({ poolAddress }, ethBlockchain))),
    Promise.all(poolAddresses.map(poolAddress => getPoolUtilization({ poolAddress }, ethBlockchain))),
    Promise.all(poolAddresses.map(poolAddress => getPoolCollaterals({ poolAddress }, ethBlockchain))),
  ])

  let totalUtilizationEth = 0

  for (let i = 0, n = poolAddresses.length; i < n; i++) {
    const poolAddress = poolAddresses[i]
    const collaterals = collateralsPerPool[i]
    const utilizationPerCollateral = await Promise.all(collaterals.map(nftId => getCollateralOutstanding({ nftId, poolAddress }, ethBlockchain)))

    totalUtilizationEth += _.sumBy(utilizationPerCollateral, 'value')
  }

  const totalCapacityUSD = _.sumBy(capacityPerPool, 'value') * ethPriceUSD
  const totalLentUSD = _.sumBy(lentPerPool, 'value') * ethPriceUSD
  const totalUtilizationUSD = totalUtilizationEth * ethPriceUSD
  const tvlUSD =  totalUtilizationUSD + totalCapacityUSD

  const globalStats: GlobalStats = {
    'block_number': blockNumber,
    'capacity_usd': totalCapacityUSD,
    'total_lent_historical_usd': totalLentUSD,
    'total_value_locked_usd': tvlUSD,
    'utilization_usd': totalUtilizationUSD,
    'utilization_ratio': totalUtilizationUSD / tvlUSD,
  }

  logger.info('Fetching global stats... OK', globalStats)

  return globalStats
}
