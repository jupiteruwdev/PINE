import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { AnyCurrency, Blockchain, Pool, Value } from '../../entities'
import { mapPool } from '../adapters'
import { getEthNFTMetadata } from '../collaterals'
import Tenor from '../utils/Tenor'
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
  address?: string
  collectionName?: string
  includeRetired?: boolean
  includeStats?: IncludeStats
  lenderAddress?: string
  tenors?: number[]
  nftId?: string
  groupBy?: boolean
  paginateBy?: {
    count: number
    offset: number
  }
  sortBy?: {
    type: PoolSortType
    direction: PoolSortDirection
  }
}

export async function filterByNftId(blockchain: Blockchain, docs: any[], nftId: string): Promise<any[]> {
  if (docs.length) {
    const metadata = await getEthNFTMetadata({ blockchain, collectionAddress: docs[0].collection.address, nftId })
    const nftProps = { id: nftId, ...metadata }
    const subDocs = docs.filter(doc => {
      if (_.isString(_.get(doc, 'collection.matcher.regex')) && _.isString(_.get(doc, 'collection.matcher.fieldPath'))) {
        const regex = new RegExp(doc.collection.matcher.regex)
        if (regex.test(_.get(nftProps, doc.collection.matcher.fieldPath))) return true
        return false
      }
      return true
    })
    return subDocs.length ? subDocs : docs
  }
  return docs
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

async function searchPublishedPools<IncludeStats extends boolean = false>(params?: Params<IncludeStats>): Promise<IncludeStats extends true ? Required<Pool>[] | Required<Pool>[][] : Pool[] | Pool[][]>
async function searchPublishedPools<IncludeStats extends boolean = false>({
  includeStats,
  paginateBy,
  ...params
}: Params<IncludeStats> = {}): Promise<Pool[] | Pool[][]> {
  const aggregation = PoolModel.aggregate(getPipelineStages({
    ...params,
  }))

  let docs
  if (params.nftId !== undefined) {
    docs = await aggregation.exec()
    docs = await filterByNftId(Blockchain.factory({
      network: 'ethereum',
      networkId: params.blockchainFilter?.ethereum,
    }), docs, params.nftId)

    if (paginateBy !== undefined) {
      docs = docs.slice(paginateBy.offset, paginateBy.offset + paginateBy.count - 1)
    }
  }
  else {
    docs = paginateBy === undefined ? await aggregation.exec() : await aggregation.skip(paginateBy.offset).limit(paginateBy.count).exec()
  }

  const pools = params.groupBy ? docs.map(doc => doc.pools.map(mapPool)) : docs.map(mapPool)

  if (includeStats !== true) return pools

  const poolsWithStats = params.groupBy
    ? await Promise.all(pools.map(group => constructPools(group))) : await constructPools(pools)

  return poolsWithStats
}

export default searchPublishedPools

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
  address,
  tenors,
  groupBy = false,
}: Params<never> = {}): PipelineStage[] {
  const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

  const collectionFilter = [
    ...collectionAddress === undefined ? [] : [{
      'collection._address': collectionAddress.toLowerCase(),
    }],
    ...collectionName === undefined ? [] : [{
      'collection.displayName': {
        $regex: `.*${collectionName}.*`,
        $options: 'i',
      },
    }],
  ]
  const poolFilter = [
    ...address === undefined ? [] : [{
      'address': address.toLowerCase(),
    }],
    ...tenors === undefined ? [] : [{
      'loanOptions.loanDurationSecond': {
        $in: Tenor.convertTenors(tenors),
      },
    }],
  ]

  const stages: PipelineStage[] = [{
    $match: {
      'networkType': blockchain.network,
      'networkId': blockchain.networkId,
      ...lenderAddress === undefined ? {} : { lenderAddress },
      ...includeRetired === true ? {} : { retired: { $ne: true } },
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
    $addFields: {
      'collection._address': {
        $toLower: '$collection.address',
      },
    },
  }, {
    $match: {
      $and: collectionFilter,
    },
  }],
  ...poolFilter.length === 0 ? [] : [{
    $addFields: {
      'address': {
        $toLower: '$address',
      },
    },
  }, {
    $match: {
      $and: poolFilter,
    },
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
  ...groupBy ? [{
    $group: {
      _id: '$collection.address',
      pools: {
        $push: '$$ROOT',
      },
    },
  },
  {
    $unset: '_id',
  }] : [],
  ]

  const nameSortField = groupBy ? 'pools.name' : 'name'
  const interestSortField = groupBy ? 'pools.lowestAPR' : 'lowestAPR'
  const ltvSortField = groupBy ? 'pools.maxLTV' : 'maxLTV'

  switch (sortBy?.type) {
  case PoolSortType.NAME:
    stages.push({
      $sort: {
        [nameSortField]: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
      },
    })
    break
  case PoolSortType.INTEREST:
    stages.push({
      $sort: {
        [interestSortField]: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
        [nameSortField]: 1,
      },
    })
    break
  case PoolSortType.LTV:
    stages.push({
      $sort: {
        [ltvSortField]: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
        [nameSortField]: 1,
      },
    })
    break
  }

  return [
    ...stages,
  ]
}
