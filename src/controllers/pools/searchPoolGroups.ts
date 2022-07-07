import _ from 'lodash'
import { Blockchain, PoolGroup, Value } from '../../entities'
import logger from '../../utils/logger'
import { SortDirection, SortType } from '../../utils/sort'
import { getEthValueUSD } from '../utils/ethereum'
import { getEthCollectionFloorPriceBatch } from '../valuations'
import getPools from './getPools'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  offset?: number
  count?: number
  collectionName?: string
  sortBy?: SortType
  sortDirection?: SortDirection
}

export default async function searchPoolGroups({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddress,
  offset,
  count,
  collectionName,
  sortBy,
  sortDirection,
}: Params) {
  logger.info('Fetching pool groups...')

  try {
    const [ethValueUSD, pools] = await Promise.all([
      getEthValueUSD(),
      getPools({
        blockchainFilter,
        collectionAddress,
        offset,
        count,
        collectionName,
        sortBy,
        sortDirection,
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
      const curIndex = _.findIndex(ethereumCollectionAddresses, collectionAddress => collectionAddress === stat.collection.address)
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
