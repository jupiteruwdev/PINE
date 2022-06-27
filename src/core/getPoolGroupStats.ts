import _ from 'lodash'
import {
  $USD, BlockchainFilter,
  EthBlockchain,
  EthereumNetwork,
  PoolGroupStats,
  SolanaNetwork,
} from '../entities'
import { getEthValueUSD } from '../utils/ethereum'
import logger from '../utils/logger'
import getEthCollectionFloorPriceBatch from './getEthCollectionFloorPriceBatch'
import getPools from './getPools'

type Params = {
  blockchainFilter?: BlockchainFilter
  collectionAddress?: string
  offset?: number
  count?: number
  collectionName?: string
}

export default async function getPoolGroupStats({
  blockchainFilter = {
    ethereum: EthereumNetwork.MAIN,
    solana: SolanaNetwork.MAINNET,
  },
  collectionAddress,
  offset,
  count,
  collectionName,
}: Params) {
  logger.info(
    `Fetching pool group stats with blockchain filter <${JSON.stringify(
      blockchainFilter
    )}>...`
  )

  const [ethValueUSD, pools] = await Promise.all([
    getEthValueUSD(),
    getPools({
      blockchainFilter,
      collectionAddress,
      offset,
      count,
      collectionName,
    }),
  ])

  const stats: PoolGroupStats[] = _.compact(
    pools.map(pool => {
      if (!pool.collection) return undefined

      return {
        collection: pool.collection,
        pools: [pool],
        totalValueLent: $USD(pool.utilization.amount.times(ethValueUSD.amount)),
        totalValueLocked: $USD(
          pool.valueLocked.amount.times(ethValueUSD.amount)
        ),
      }
    })
  )

  const ethereumCollectionAddresses = _.filter(
    stats,
    stat => stat.collection.blockchain.network === 'ethereum'
  ).reduce(
    (cur: any, stat: PoolGroupStats) => [
      ...cur,
      stat.collection.address,
    ],
    []
  )

  const floorPrices = await getEthCollectionFloorPriceBatch({
    blockchainFilter: {
      ethereum: EthBlockchain().networkId,
    },
    collectionAddresses: ethereumCollectionAddresses,
  })

  const out = stats.map((stat, i) => {
    const curIndex = _.findIndex(ethereumCollectionAddresses, collectionAddress => collectionAddress === stat.collection.address)
    return {
      ...stat,
      floorPrice: floorPrices.length > curIndex && curIndex !== -1 ? floorPrices[curIndex].value1DReference : undefined,
    }
  })

  logger.info('Fetching pool group stats... OK', out)

  return out
}
