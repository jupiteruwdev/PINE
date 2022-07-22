import BigNumber from 'bignumber.js'
import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { mapPool } from '../../db/adapters'
import { Blockchain, Pool, Value } from '../../entities'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

export enum PoolSortType {
  NAME = 'name',
  LTV = 'ltv',
  INTEREST = 'interest',
}

export enum PoolSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}


type Params<IncludeStats> = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  collectionName?: string
  includeRetired?: boolean,
  includeStats?: IncludeStats
  lenderAddress?: string
  paginateBy?: {
    count: number
    offset: number
  }
  sortBy?: {
    type: PoolSortType
    direction: PoolSortDirection
  }
}

async function getPools<IncludeStats extends boolean = false>(params?: Params<IncludeStats>): Promise<IncludeStats extends true ? Required<Pool>[] : Pool[]>
async function getPools<IncludeStats extends boolean = false>({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddress,
  collectionName,
  includeRetired = false,
  includeStats,
  lenderAddress,
  paginateBy,
  sortBy,
}: Params<IncludeStats> = {}): Promise<Pool[]> {
  const aggregation = PoolModel.aggregate(getPipelineStages({
    blockchainFilter,
    collectionAddress,
    collectionName,
    includeRetired,
    lenderAddress,
    sortBy,
  }))

  const docs = paginateBy === undefined ? await aggregation.exec() : await aggregation.skip(paginateBy.offset).limit(paginateBy.count).exec()
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

  switch (sortBy?.type) {
  case PoolSortType.NAME:
    stages.push({
      $sort: {
        name: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
      },
    })
    break
  case PoolSortType.INTEREST:
    stages.push({
      $sort: {
        lowestAPR: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
        name: 1,
      },
    })
    break
  case PoolSortType.LTV:
    stages.push({
      $sort: {
        maxLTV: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
        name: 1,
      },
    })
    break
  }

  return stages
}
