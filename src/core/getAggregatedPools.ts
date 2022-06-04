import _ from 'lodash'
import AggregatedPool from '../entities/lib/AggregatedPool'
import Blockchain, { BlockchainFilter } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import SolanaNetwork from '../entities/lib/SolanaNetwork'
import { $USD } from '../entities/lib/Value'
import { getEthValueUSD } from '../utils/ethereum'
import logger from '../utils/logger'
import getEthCollectionFloorPrice from './getEthCollectionFloorPrice'
import getPools from './getPools'

type Params = {
  blockchainFilter?: BlockchainFilter
  collectionAddress?: string
  offset?: number
  count?: number
}

export default async function getAggregatedPools({ blockchainFilter = { ethereum: EthereumNetwork.MAIN, solana: SolanaNetwork.MAINNET }, collectionAddress, offset, count }: Params) {
  logger.info(`Fetching aggregated pools with blockchain filter <${JSON.stringify(blockchainFilter)}>...`)

  const [ethValueUSD, pools] = await Promise.all([getEthValueUSD(), getPools({ blockchainFilter, collectionAddress, offset, count })])

  const aggregatedPools: AggregatedPool[] = _.compact(pools.map(pool => {
    if (!pool.collection) return undefined

    return {
      collection: pool.collection,
      pools: [pool],
      totalValueLent: $USD(pool.utilization.amount.times(ethValueUSD.amount)),
      totalValueLocked: $USD(pool.valueLocked.amount.times(ethValueUSD.amount)),
    }
  }))

  const floorPricesRes = await Promise.allSettled(aggregatedPools.map(pool => {
    switch (pool.collection.blockchain.network) {
    case 'ethereum':
      return getEthCollectionFloorPrice({
        blockchain: pool.collection.blockchain as Blockchain<'ethereum'>,
        collectionAddress: pool.collection.address,
      })
    case 'solana':
      return undefined
    }
  }))

  const out = floorPricesRes.map((res, i) => ({
    ...aggregatedPools[i],
    floorPrice: res?.status === 'fulfilled' ? res.value : undefined,
  }))

  logger.info('Fetching aggregated pools... OK', out)

  return out
}
