import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { mapPool } from '../../db/adapters'
import { Blockchain, Pool, Value } from '../../entities'
import { SortDirection, SortType } from '../../utils/sort'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

type Params<IncludeStats> = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  collectionName?: string
  count?: number
  includeRetired?: boolean,
  includeStats?: IncludeStats,
  lenderAddress?: string
  offset?: number
  sortBy?: SortType
  sortDirection?: SortDirection
}

async function getPools<IncludeStats extends boolean = false>(params?: Params<IncludeStats>): Promise<IncludeStats extends true ? Required<Pool>[] : Pool[]>
async function getPools<IncludeStats extends boolean = false>({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddress,
  lenderAddress,
  includeRetired = false,
  includeStats,
  offset,
  count,
  collectionName,
  sortBy,
  sortDirection,
}: Params<IncludeStats> = {}): Promise<Pool[]> {
  const aggregation = PoolModel.aggregate(getPipelineStages({
    blockchainFilter,
    collectionAddress,
    collectionName,
    includeRetired,
    lenderAddress,
    sortBy,
    sortDirection,
  }))

  const docs = _.isNil(offset) || _.isNil(count) ? await aggregation.exec() : await aggregation.skip(offset).limit(count).exec()
  const pools = docs.map(mapPool)

  if (includeStats !== true) return pools

  const poolsWithStats = await Promise.all(
    pools.map(async pool => {
      const [{ amount: utilizationEth }, { amount: capacityEth }] =
        await Promise.all([
          getPoolUtilization({
            blockchain: pool.blockchain,
            poolAddress: pool.address,
          }),
          getPoolCapacity({
            blockchain: pool.blockchain,
            poolAddress: pool.address,
          }),
        ])

      const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(pool.ethLimit || Number.POSITIVE_INFINITY)) ? new BigNumber(pool.ethLimit ?? 0) : capacityEth.plus(utilizationEth)

      return {
        ...pool,
        utilization: Value.$ETH(utilizationEth),
        valueLocked: Value.$ETH(valueLockedEth),
      }
    })
  )

  return poolsWithStats
}

export default getPools

function getPipelineStages({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddress,
  collectionName,
  includeRetired = false,
  lenderAddress,
  sortBy,
  sortDirection = SortDirection.ASC,
}: Params<never> = {}): PipelineStage[] {
  const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

  const filter: Record<string, any>[] = [{
    'collection.networkType': blockchain.network,
  }, {
    'collection.networkId': parseInt(blockchain.networkId, 10),
  }]

  if (collectionAddress !== undefined) {
    filter.push({
      'collection.address': collectionAddress,
    })
  }

  if (lenderAddress !== undefined) {
    filter.push({
      lenderAddress,
    })
  }

  if (collectionName !== undefined) {
    filter.push({
      'collection.displayName': {
        $regex: `.*${collectionName}.*`,
        $options: 'i',
      },
    })
  }

  if (!includeRetired) {
    filter.push({
      retired: {
        $ne: true,
      },
    })
  }

  const stages: PipelineStage[] = [{
    $lookup: {
      from: 'nftCollections',
      localField: 'nftCollection',
      foreignField: '_id',
      as: 'collection',
    },
  }, {
    $unwind: '$collection',
  }, {
    $match: {
      $and: filter,
    },
  }, {
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
  }]

  switch (sortBy) {
  case SortType.NAME:
    stages.push({
      $sort: {
        name: sortDirection === SortDirection.ASC ? 1 : -1,
      },
    })
    break
  case SortType.INTEREST:
    stages.push({
      $sort: {
        lowestAPR: sortDirection === SortDirection.ASC ? 1 : -1,
        name: 1,
      },
    })
    break
  case SortType.LTV:
    stages.push({
      $sort: {
        maxLTV: sortDirection === SortDirection.ASC ? 1 : -1,
        name: 1,
      },
    })
    break
  }

  return stages
}
