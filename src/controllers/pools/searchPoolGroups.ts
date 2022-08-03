import _ from 'lodash'
import { Blockchain, PoolGroup, Value } from '../../entities'
import logger from '../../utils/logger'
import getEthValueUSD from '../utils/getEthValueUSD'
import { getEthCollectionFloorPriceBatch } from '../valuations'
import searchPublishedPools, { PoolSortDirection, PoolSortType } from './searchPublishedPools'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  offset?: number
  count?: number
  collectionName?: string
  paginateBy?: {
    count: number
    offset: number
  }
  sortBy?: {
    type: PoolSortType
    direction: PoolSortDirection
  }
}

export default async function searchPoolGroups({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddress,
  collectionName,
  paginateBy,
  sortBy,
}: Params) {
  logger.info('Fetching pool groups...')

  try {
    const [ethValueUSD, pools] = await Promise.all([
      getEthValueUSD(),
      searchPublishedPools({
        blockchainFilter,
        collectionAddress,
        collectionName,
        includeStats: true,
        paginateBy,
        sortBy,
      }),
    ])

    const poolGroups: PoolGroup[] = _.compact(
      pools.map(pool => {
        if (!pool.collection) return undefined

        return {
          collection: pool.collection,
          pools: [pool],
          totalValueLent: Value.$USD(pool.utilization.amount.times(ethValueUSD.amount)),
          totalValueLocked: Value.$USD(
            pool.valueLocked.amount.times(ethValueUSD.amount)
          ),
        }
      })
    )

    const ethereumCollectionAddresses = _.filter(
      poolGroups,
      stat => stat.collection.blockchain.network === 'ethereum'
    ).reduce(
      (cur: any, stat: PoolGroup) => [
        ...cur,
        stat.collection.address,
      ],
      []
    )

    const floorPrices = await getEthCollectionFloorPriceBatch({
      blockchainFilter: {
        ethereum: blockchainFilter.ethereum,
      },
      collectionAddresses: ethereumCollectionAddresses,
    })

    const out = poolGroups.map((stat, i) => {
      const curIndex = _.findIndex(floorPrices, fp => fp.collection.address.toLowerCase() === stat.collection.address.toLowerCase())
      return {
        ...stat,
        floorPrice: floorPrices.length > curIndex && curIndex !== -1 ? floorPrices[curIndex].value1DReference : undefined,
      }
    })

    logger.info('Fetching pool groups... OK', out)

    return out
  }
  catch (err) {
    logger.error('Fetching pool groups... ERR:', err)

    throw err
  }
}
