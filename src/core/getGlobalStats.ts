import _ from 'lodash'
import { AnyBlockchain } from '../entities/Blockchain'
import GlobalStats from '../entities/GlobalStats'
import { $USD } from '../entities/Value'
import { getEthValueUSD } from '../utils/ethereum'
import failure from '../utils/failure'
import logger from '../utils/logger'
import mapBlockchainFilterToDict from '../utils/mapBlockchainFilterToDict'
import getPoolHistoricalLent from './getPoolHistoricalLent'
import getPools from './getPools'

type Params = {
  /**
   * Blockchains to filter for the returned pools. Any missing blockchains in this object will be
   * auto mapped to their default network IDs.
   */
  blockchains?: { [K in AnyBlockchain]?: string }
}

export default async function getGlobalStats({ blockchains }: Params = {}): Promise<GlobalStats> {
  try {
    logger.info('Fetching global stats...')

    const blockchainDict = mapBlockchainFilterToDict(blockchains ?? {}, true)

    const [
      ethValueUSD,
      pools,
    ] = await Promise.all([
      getEthValueUSD(),
      getPools({ blockchains: _.mapValues(blockchainDict, blockchain => blockchain.networkId) }),
    ])

    const totalCapacityUSD = _.sumBy(pools, t => (t.valueLocked?.amount ?? NaN) - (t.utilization?.amount ?? NaN)) * ethValueUSD.amount
    const totalUtilizationUSD = _.sumBy(pools, t => t.utilization?.amount ?? NaN) * ethValueUSD.amount
    const tvlUSD =  totalUtilizationUSD + totalCapacityUSD

    const lentPerPool = await Promise.all(pools.map(pool => getPoolHistoricalLent({ blockchain: blockchainDict.ethereum, poolAddress: pool.address })))
    const totalLentlUSD = _.sumBy(lentPerPool, t => t.amount) * ethValueUSD.amount

    const globalStats: GlobalStats = {
      capacity: $USD(totalCapacityUSD),
      totalValueLentHistorical: $USD(totalLentlUSD),
      totalValueLocked: $USD(tvlUSD),
      utilization: $USD(totalUtilizationUSD),
      utilizationRatio: totalUtilizationUSD / tvlUSD,
    }

    logger.info('Fetching global stats... OK', globalStats)

    return globalStats
  }
  catch (err) {
    throw failure('FETCH_GLOBAL_STATS_FAILURE', err)
  }
}
