import _ from 'lodash'
import { $USD, Blockchain, BlockchainFilter, EthereumNetwork, PoolGroupStats, SolanaNetwork } from '../entities'
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

export default async function getPoolGroupStats({ blockchainFilter = { ethereum: EthereumNetwork.MAIN, solana: SolanaNetwork.MAINNET }, collectionAddress, offset, count }: Params) {
  logger.info(`Fetching pool group stats with blockchain filter <${JSON.stringify(blockchainFilter)}>...`)

  const [ethValueUSD, pools] = await Promise.all([getEthValueUSD(), getPools({ blockchainFilter, collectionAddress, offset, count })])

  const stats: PoolGroupStats[] = _.compact(pools.map(pool => {
    if (!pool.collection) return undefined

    return {
      collection: pool.collection,
      pools: [pool],
      totalValueLent: $USD(pool.utilization.amount.times(ethValueUSD.amount)),
      totalValueLocked: $USD(pool.valueLocked.amount.times(ethValueUSD.amount)),
    }
  }))

  const floorPricesRes = await Promise.allSettled(stats.map(pool => {
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
    ...stats[i],
    floorPrice: res?.status === 'fulfilled' ? res.value : undefined,
  }))

  logger.info('Fetching pool group stats... OK', out)

  return out
}
