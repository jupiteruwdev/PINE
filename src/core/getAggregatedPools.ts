import _ from 'lodash'
import AggregatedPool from '../entities/AggregatedPool'
import Blockchain from '../entities/Blockchain'
import { $USD } from '../entities/Value'
import { getEthValueUSD } from '../utils/ethereum'
import logger from '../utils/logger'
import getPools from './getPools'

export default async function getAggregatedPools(blockchains?: Blockchain[]) {
  logger.info('Fetching aggregated pools...')

  const [ethValueUSD, pools] = await Promise.all([getEthValueUSD(), getPools(blockchains)])

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
