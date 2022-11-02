import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { Blockchain, Pool, Value } from '../../entities'
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
  collectionAddresses?: string[]
  addresses?: string[]
  collectionName?: string
  includeRetired?: boolean
  includeStats?: IncludeStats
  lenderAddress?: string
  tenors?: number[]
  nftIds?: string[]
  paginateBy?: {
    count: number
    offset: number
  }
  sortBy?: {
    type: PoolSortType
    direction: PoolSortDirection
  }
}

export async function filterByNftId(blockchain: Blockchain, docs: any[], nftIds: string[]): Promise<any[]> {
  if (docs.length) {
    let subDocs = docs
    nftIds.forEach(async nftId => {
      const metadata = await getEthNFTMetadata({ blockchain, collectionAddress: docs[0].collection.address, nftId })
      const nftProps = { id: nftId, ...metadata }
      subDocs = subDocs.concat(docs.filter(doc => {
        if (_.isString(_.get(doc, 'collection.matcher.regex')) && _.isString(_.get(doc, 'collection.matcher.fieldPath'))) {
          const regex = new RegExp(doc.collection.matcher.regex)
          if (regex.test(_.get(nftProps, doc.collection.matcher.fieldPath))) return true
          return false
        }
        return true
      }))
    })
    return subDocs.length ? subDocs : docs
  }
  return docs
}

async function filterPoolsByInterest(docs: any[]): Promise<any[]> {
  const filteredPools: any[] = []

  docs.map(doc => {
    const existIndex = filteredPools.findIndex(p => doc.collection.address === p.collection.address)

    if (existIndex !== -1) {
      if (doc.interest > filteredPools[existIndex].interest) {
        filteredPools.splice(existIndex, 1, doc)
      }
    }
    else {
      filteredPools.push(doc)
    }
  })

  return filteredPools
}

async function searchPublishedMultiplePools<IncludeStats extends boolean = false>(params?: Params<IncludeStats>): Promise<IncludeStats extends true ? Required<Pool>[] : Pool[]>
async function searchPublishedMultiplePools<IncludeStats extends boolean = false>({
  includeStats,
  paginateBy,
  ...params
}: Params<IncludeStats> = {}): Promise<Pool[]> {
  const aggregation = PoolModel.aggregate(getPipelineStages({
    ...params,
  }))

  let docs
  if (params.nftIds !== undefined) {
    docs = await aggregation.exec()
    docs = await filterByNftId(Blockchain.factory({
      network: 'ethereum',
      networkId: params.blockchainFilter?.ethereum,
    }), docs, params.nftIds)

    if (paginateBy !== undefined) {
      docs = docs.slice(paginateBy.offset, paginateBy.offset + paginateBy.count - 1)
    }
  }
  else {
    docs = paginateBy === undefined ? await aggregation.exec() : await aggregation.skip(paginateBy.offset).limit(paginateBy.count).exec()
  }

  const pools = (await filterPoolsByInterest(docs)).map(mapPool)

  if (includeStats !== true) return pools

  const poolsWithStats = await Promise.all(pools.map(async pool => {
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

  return poolsWithStats
}

export default searchPublishedMultiplePools

function getPipelineStages({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddresses,
  collectionName,
  includeRetired = false,
  lenderAddress,
  sortBy,
  addresses,
  tenors,
}: Params<never> = {}): PipelineStage[] {
  const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

  const collectionFilter = [
    ...collectionAddresses === undefined ? [] : [{
      'collection.address': {
        $regex: collectionAddresses.join('|'),
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
  const poolFilter = [
    ...addresses === undefined ? [] : [{
      'address': {
        $regex: addresses.join('|'),
        $options: 'i',
      },
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
    $match: { $and: collectionFilter },
  }],
  ...poolFilter.length === 0 ? [] : [{
    $match: { $and: poolFilter },
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
        $toDouble: {
          $min: '$loanOptions.interestBpsBlock',
        },
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
  ]

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
