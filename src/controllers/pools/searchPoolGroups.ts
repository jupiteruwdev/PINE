import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { AnyCurrency, Blockchain, Pool, PoolGroup, Value } from '../../entities'
import logger from '../../utils/logger'
import { mapPool } from '../adapters'
import { getEthCollectionFloorPrices } from '../collections'
import getEthValueUSD from '../utils/getEthValueUSD'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'
import { PoolSortDirection, PoolSortType } from './searchPublishedPools'
import $ETH = Value.$ETH;

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

function constructPools(pools: Pool[]): Promise<Pool<AnyCurrency>[]> {
  const constructedPools = Promise.all(pools.map(async pool => {
    const [{ amount: utilizationEth }, { amount: capacityEth }] =
      await Promise.all([
        getPoolUtilization({
          blockchain: pool.blockchain,
          poolAddress: pool.address,
        }),
        getPoolCapacity({ blockchain: pool.blockchain, poolAddress: pool.address, fundSource: pool.fundSource, tokenAddress: pool.tokenAddress }),
      ])

    const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(pool.ethLimit || Number.POSITIVE_INFINITY)) ? new BigNumber(pool.ethLimit ?? 0) : capacityEth.plus(utilizationEth)

    return Pool.factory({
      ...pool,
      utilization: Value.$ETH(utilizationEth),
      valueLocked: Value.$ETH(valueLockedEth),
    })
  }))

  return constructedPools
}

async function searchPublishedPoolGroups({
  paginateBy,
  ...params
}: Params = {}): Promise<Pool[][]> {
  const aggregation = PoolModel.aggregate(getPipelineStages({
    ...params,
  }))

  const docs = paginateBy === undefined ? await aggregation.exec() : await aggregation.skip(paginateBy.offset).limit(paginateBy.count).exec()

  const pools = docs.map(doc => doc.pools.map(mapPool))

  const poolsWithStats = await Promise.all(pools.map(group => constructPools(group)))

  return poolsWithStats
}

function getPipelineStages({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddress,
  collectionName,
  sortBy,
}: Params = {}): PipelineStage[] {
  const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

  const collectionFilter = [
    ...collectionAddress === undefined ? [] : [{
      'collection.address': {
        $regex: collectionAddress,
        $options: 'i',
      },
    }],
    ...collectionName === undefined ? [] : [{
      'collection.displayName': {
        $regex: `.*${collectionName}.*`,
        $options: 'i',
      },
    }],
  ]

  const stages: PipelineStage[] = [{
    $match: {
      'retired': { $ne: true },
      'networkType': blockchain.network,
      'networkId': blockchain.networkId,
    },
  }, {
    $lookup: {
      from: 'nftCollections',
      localField: 'nftCollection',
      foreignField: '_id',
      as: 'collection',
    },
  }, {
    $unwind: '$collection',
  },
  ...collectionFilter.length === 0 ? [] : [{
    $match: { $and: collectionFilter },
  }], {
    $addFields: {
      name: {
        $toLower: {
          $trim: {
            input: '$collection.displayName',
            chars: '"',
          },
        },
      },
      interest: {
        $min: '$loanOptions.interestBpsBlock',
      },
      interestOverride: {
        $min: '$loanOptions.interestBpsBlockOverride',
      },
      maxLTV: {
        $max: '$loanOptions.maxLtvBps',
      },
    },
  }, {
    $addFields: {
      lowestAPR: {
        $cond: {
          if: {
            $ne: ['$interestOverride', null],
          },
          then: '$interestOverride',
          else: '$interest',
        },
      },
    },
  },
  {
    $group: {
      _id: '$collection.address',
      pools: {
        $push: '$$ROOT',
      },
    },
  },
  {
    $unset: '_id',
  },
  ]

  switch (sortBy?.type) {
  case PoolSortType.NAME:
    stages.push({
      $sort: {
        'pools.name': sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
      },
    })
    break
  case PoolSortType.INTEREST:
    stages.push({
      $sort: {
        'pools.lowestAPR': sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
        'pools.name': 1,
      },
    })
    break
  case PoolSortType.LTV:
    stages.push({
      $sort: {
        'pools.maxLTV': sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
        'pools.name': 1,
      },
    })
    break
  }

  return [
    ...stages,
  ]
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
    const [ethValueUSD, groups] = await Promise.all([
      getEthValueUSD(),
      searchPublishedPoolGroups({
        blockchainFilter,
        collectionAddress,
        collectionName,
        paginateBy,
        sortBy,
      }),
    ])

    const pools = groups as Required<Pool>[][]

    const poolGroups = pools.map((group: Required<Pool>[]) => PoolGroup.factory({
      collection: group[0].collection,
      pools: group.map(pool => ({
        ...pool,
        valueLocked: Value.$USD(pool.valueLocked.amount.times(ethValueUSD.amount)),
      })),
      totalValueLent: Value.$USD(
        group
          .reduce((sum, pool: Pool) => sum.plus(pool.utilization?.amount || 0), new BigNumber(0))
          .times(ethValueUSD.amount)
      ),
      totalValueLocked: Value.$USD(
        group
          .reduce((sum, pool: Pool) => sum.plus(pool.valueLocked?.amount || 0), new BigNumber(0))
          .times(ethValueUSD.amount)
      ),
    }))

    const out = poolGroups.map(group => (
      {
        ...group,
        floorPrice: group.collection.valuation?.value,
      }
    ))

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
