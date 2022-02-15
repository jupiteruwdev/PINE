import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { AnyBlockchain } from '../entities/lib/Blockchain'
import GlobalStats from '../entities/lib/GlobalStats'
import { $USD } from '../entities/lib/Value'
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
    const blockchainDict = mapBlockchainFilterToDict(blockchains ?? {}, true)

    logger.info(`Fetching global stats for blockchains <${JSON.stringify(blockchainDict)}>...`)

    const [
      ethValueUSD,
      pools,
    ] = await Promise.all([
      getEthValueUSD(),
      getPools({ blockchains: _.mapValues(blockchainDict, blockchain => blockchain.networkId) }),
    ])

    const valueUSD = new BigNumber(ethValueUSD.amount)

    const totalUtilizationUSD = pools.reduce((p, c) => p.plus(new BigNumber(c.utilization.amount)), new BigNumber(0)).times(valueUSD)
    const totalValueLockedUSD = pools.reduce((p, c) => p.plus(new BigNumber(c.valueLocked.amount)), new BigNumber(0)).times(valueUSD)
    const totalCapacityUSD = totalValueLockedUSD.minus(totalUtilizationUSD)

    const lentEthPerPool = await Promise.all(pools.map(pool => getPoolHistoricalLent({ blockchain: blockchainDict.ethereum, poolAddress: pool.address })))
    const totalLentlUSD = lentEthPerPool.reduce((p, c) => p.plus(new BigNumber(c.amount)), new BigNumber(0)).times(valueUSD)

    const globalStats: GlobalStats = {
      capacity: $USD(totalCapacityUSD),
      totalValueLentHistorical: $USD(totalLentlUSD),
      totalValueLocked: $USD(totalValueLockedUSD),
      utilization: $USD(totalUtilizationUSD),
      utilizationRatio: totalUtilizationUSD.div(totalValueLockedUSD).toFixed(),
    }

    logger.info('Fetching global stats... OK', globalStats)

    return globalStats
  }
  catch (err) {
    throw failure('FETCH_GLOBAL_STATS_FAILURE', err)
  }
}
