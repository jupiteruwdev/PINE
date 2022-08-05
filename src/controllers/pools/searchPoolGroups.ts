import _ from 'lodash'
import { Blockchain, PoolGroup, Value } from '../../entities'
import logger from '../../utils/logger'
import getEthValueUSD from '../utils/getEthValueUSD'
import { getEthCollectionFloorPrices } from '../valuations'
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
  logger.info('Searching pool groups...')

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

    const poolGroups = pools.map(pool => PoolGroup.factory({
      collection: pool.collection,
      pools: [pool],
      totalValueLent: Value.$USD(pool.utilization.amount.times(ethValueUSD.amount)),
      totalValueLocked: Value.$USD(pool.valueLocked.amount.times(ethValueUSD.amount)),
    }))

    const ethGroups = _.filter(poolGroups, group => group.collection.blockchain.network === 'ethereum')
    const ethFloorPrices = await getEthCollectionFloorPrices({ blockchain: Blockchain.Ethereum(blockchainFilter.ethereum), collectionAddresses: ethGroups.map(group => group.collection.address) })

    const out = poolGroups.map(group => {
      const ethIdx = ethGroups.findIndex(t => t.collection.address === group.collection.address)

      return {
        ...group,
        floorPrice: ethFloorPrices[ethIdx] ?? undefined,
      }
    })

    logger.info(`Searching pool groups... OK: Found ${out.length} result(s)`)
    logger.debug(JSON.stringify(out, undefined, 2))

    return out
  }
  catch (err) {
    logger.error('Searching pool groups... ERR')
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw err
  }
}
