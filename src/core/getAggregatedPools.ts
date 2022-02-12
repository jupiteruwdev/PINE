import _ from 'lodash'
import AggregatedPool from '../entities/AggregatedPool'
import { AnyBlockchain } from '../entities/Blockchain'
import { $USD } from '../entities/Value'
import { getEthValueUSD } from '../utils/ethereum'
import logger from '../utils/logger'
import getPools from './getPools'

export default async function getAggregatedPools(blockchainFilter?: { [K in AnyBlockchain]?: string }) {
  logger.info(`Fetching aggregated pools with blockchain filter <${JSON.stringify(blockchainFilter)}>...`)

  const [ethValueUSD, pools] = await Promise.all([getEthValueUSD(), getPools(blockchainFilter)])

  const aggregatedPools: AggregatedPool[] = _.compact(pools.map(pool => {
    if (!pool.collection) return undefined

    return  {
      collection: pool.collection,
      pools: [pool],
      totalValueLent: $USD((pool.utilization?.amount ?? NaN) * ethValueUSD.amount),
      totalValueLocked: $USD((pool.valueLocked?.amount ?? NaN) * ethValueUSD.amount),
    }
  }))

  logger.info('Fetching aggregated pools... OK', aggregatedPools)

  return aggregatedPools
}
