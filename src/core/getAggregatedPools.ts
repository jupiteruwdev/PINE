import _ from 'lodash'
import AggregatedPool from '../entities/lib/AggregatedPool'
import { AnyBlockchain, EthBlockchain } from '../entities/lib/Blockchain'
import { $USD } from '../entities/lib/Value'
import { getEthValueUSD } from '../utils/ethereum'
import logger from '../utils/logger'
import mapBlockchainFilterToDict from '../utils/mapBlockchainFilterToDict'
import getEthCollectionFloorPrice from './getEthCollectionFloorPrice'
import getPools from './getPools'

type Params = {
  /**
   * Blockchains to filter for the returned pools. If specified, only pools residing in the
   * mapped blockchains will be returned. Otherwise if unspecified (i.e. `filter.blockchains` ===
   * `undefined`), all pools of all blockchains in their default network IDs will be returned.
   */
  blockchains?: { [K in AnyBlockchain]?: string }
  collectionAddress?: string
  offset?: number
  count?: number
}

export default async function getAggregatedPools({ blockchains, collectionAddress, offset, count }: Params) {
  logger.info(`Fetching aggregated pools with blockchain filter <${JSON.stringify(blockchains)}>...`)

  const blockchainDict = blockchains === undefined ? mapBlockchainFilterToDict({}, true) : mapBlockchainFilterToDict(blockchains, false)
  const [ethValueUSD, pools] = await Promise.all([getEthValueUSD(), getPools({ blockchains, collectionAddress, offset, count })])

  const aggregatedPools: AggregatedPool[] = _.compact(pools.map(pool => {
    if (!pool.collection) return undefined

    return {
      collection: pool.collection,
      pools: [pool],
      totalValueLent: $USD(pool.utilization.amount.times(ethValueUSD.amount)),
      totalValueLocked: $USD(pool.valueLocked.amount.times(ethValueUSD.amount)),
    }
  }))

  const floorPricesRes = await Promise.allSettled(aggregatedPools.map(pool => getEthCollectionFloorPrice({
    blockchain: blockchainDict.ethereum ?? EthBlockchain(),
    collectionAddress: pool.collection.address,
  })))

  const out = floorPricesRes.map((res, i) => ({
    ...aggregatedPools[i],
    floorPrice: res.status === 'fulfilled' ? res.value : undefined,
  }))

  logger.info('Fetching aggregated pools... OK', out)

  return out
}
