import BigNumber from 'bignumber.js'
import _ from 'lodash'
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
  count?: number
  includeRetired?: boolean,
  includeStats?: IncludeStats,
  lenderAddress?: string
  offset?: number
  sort?: {
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
  lenderAddress,
  includeRetired = false,
  includeStats,
  offset,
  count,
  collectionName,
  sort,
}: Params<IncludeStats> = {}): Promise<Pool[]> {
  const aggregation = PoolModel.aggregate(getPipelineStages({
    blockchainFilter,
    collectionAddress,
    collectionName,
    includeRetired,
    lenderAddress,
    sort,
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
  sort,
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

  switch (sort?.type) {
  case PoolSortType.NAME:
    stages.push({
      $sort: {
        name: sort?.direction === PoolSortDirection.DESC ? -1 : 1,
      },
    })
    break
  case PoolSortType.INTEREST:
    stages.push({
      $sort: {
        lowestAPR: sort?.direction === PoolSortDirection.DESC ? -1 : 1,
        name: 1,
      },
    })
    break
  case PoolSortType.LTV:
    stages.push({
      $sort: {
        maxLTV: sort?.direction === PoolSortDirection.DESC ? -1 : 1,
        name: 1,
      },
    })
    break
  }

  return stages
}
