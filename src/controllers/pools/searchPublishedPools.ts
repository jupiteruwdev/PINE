import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { Blockchain, Pool } from '../../entities'
import { mapPool } from '../adapters'
import { getEthNFTMetadata } from '../collaterals'
import Tenor from '../utils/Tenor'

export enum PoolSortType {
  NAME = 'name',
  LTV = 'ltv',
  INTEREST = 'interest',
  UTILIZATION = 'utilization',
}

export enum PoolSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  address?: string
  collectionName?: string
  includeRetired?: boolean
  checkLimit?: boolean
  lenderAddress?: string
  tenors?: number[]
  nftId?: string
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

async function searchPublishedPools({
  checkLimit,
  paginateBy,
  ...params
}: Params): Promise<Pool[]> {
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

  const pools = docs.map(mapPool)

  if (checkLimit) {
    return pools.filter(pool => !(!!pool.collection?.valuation?.value?.amount && pool.ethLimit !== 0 && pool.loanOptions.some(option => pool.utilization?.amount.plus(pool.collection?.valuation?.value?.amount ?? new BigNumber(0)).gt(new BigNumber(pool.ethLimit ?? 0)))))
  }
  return pools
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
}: Params): PipelineStage[] {
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
  const poolFilter = [
    ...address === undefined ? [] : [{
      'address': {
        $regex: address,
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
  case PoolSortType.UTILIZATION:
    stages.push({
      $sort: {
        utilizationEth: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
        name: 1,
      },
    })
    break
  }

  return stages
}
