import BigNumber from 'bignumber.js'
import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { Blockchain, NFT, Pool, PoolGroup, Value } from '../../entities'
import logger from '../../utils/logger'
import { mapPool } from '../adapters'
import { getNFTsByOwner } from '../collaterals'
import getEthValueUSD from '../utils/getEthValueUSD'
import { PoolSortDirection, PoolSortType } from './searchPublishedPools'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  ownerAddress?: string
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

async function searchPublishedPoolGroups({
  paginateBy,
  ...params
}: Params = {}): Promise<Pool[][]> {
  const aggregation = PoolModel.aggregate(getPipelineStages({
    ...params,
  }))

  const docs = paginateBy === undefined ? await aggregation.exec() : await aggregation.skip(paginateBy.offset).limit(paginateBy.count).exec()

  return docs.map(doc => doc.pools.map(mapPool))
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
      groupValueLocked: {
        $sum: '$valueLockedEth',
      },
      groupUtilization: {
        $sum: '$utilizationEth',
      },
      pools: {
        $push: '$$ROOT',
      },
    },
  },
  {
    $addFields: {
      totalUtilization: {
        $cond: {
          if: {
            $ne: ['$groupValueLocked', 0],
          },
          then: {
            $divide: ['$groupUtilization', '$groupValueLocked'],
          },
          else: 0,
        },
      },
    },
  },
  {
    $match: {
      'groupValueLocked': {
        $gte: 0.01,
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
  case PoolSortType.UTILIZATION:
    stages.push({
      $sort: {
        'totalUtilization': sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
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
  ownerAddress,
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

    let nfts: NFT[] = []

    if (ownerAddress) {
      nfts = await getNFTsByOwner({
        blockchain: {
          network: 'ethereum',
          networkId: blockchainFilter.ethereum ?? '',
        },
        ownerAddress,
        collectionAddress,
        populateMetadata: true,
      })
    }

    const pools = groups as Required<Pool>[][]

    const poolGroups = pools.map((group: Required<Pool>[]) => PoolGroup.factory({
      collection: group[0].collection,
      pools: group.map(pool => ({
        ...pool,
        valueLocked: Value.$USD(pool.valueLocked.amount.times(ethValueUSD.amount)),
        utilization: Value.$USD(pool.utilization.amount.times(ethValueUSD.amount)),
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
      nfts,
    }))

    const out = poolGroups.map(group => ({
      ...group,
      floorPrice: group.collection.valuation?.value,
    }))

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
