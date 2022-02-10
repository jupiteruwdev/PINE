import _ from 'lodash'
import appConf from '../app.conf'
import { EthBlockchain } from '../entities/Blockchain'
import GlobalStats from '../entities/GlobalStats'
import { $USD } from '../entities/Value'
import { getEthValueUSD } from '../utils/ethereum'
import logger from '../utils/logger'
import getPoolCapacity from './getPoolCapacity'
import getPoolLent from './getPoolLent'
import getPoolUtilization from './getPoolUtilization'

export default async function getGlobalStats() {
  logger.info('Fetching global stats...')

  const ethBlockchain = EthBlockchain()
  const poolAddresses = appConf.v1Pools

  const [
    ethValueUSD,
    capacityPerPool,
    lentPerPool,
    utilizationPerPool,
  ] = await Promise.all([
    getEthValueUSD(),
    Promise.all(poolAddresses.map(poolAddress => getPoolCapacity({ poolAddress }, ethBlockchain))),
    Promise.all(poolAddresses.map(poolAddress => getPoolLent({ poolAddress }, ethBlockchain))),
    Promise.all(poolAddresses.map(poolAddress => getPoolUtilization({ poolAddress }, ethBlockchain))),
  ])

  const totalCapacityUSD = _.sumBy(capacityPerPool, t => t.amount) * ethValueUSD.amount
  const totalLentUSD = _.sumBy(lentPerPool, t => t.amount) * ethValueUSD.amount
  const totalUtilizationUSD = _.sumBy(utilizationPerPool, t => t.amount) * ethValueUSD.amount
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
