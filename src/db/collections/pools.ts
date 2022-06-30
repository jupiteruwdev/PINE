/**
 * @todo Use proper db.
 */

import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import getPoolContract from '../../core/getPoolContract'
import { Blockchain, Pool } from '../../entities'
import { SortDirection, SortType } from '../../utils/sort'
import { mapCollection, mapPool } from '../adapters'
import { PoolModel } from '../models'

type FindOneFilter = {
  address?: string
  collectionAddress?: string
  collectionId?: string
  blockchain?: Blockchain
  includeRetired?: boolean
}

type FindAllFilter = {
  collectionAddress?: string
  collectionId?: string
  blockchainFilter?: Blockchain.Filter
  includeRetired?: boolean
  offset?: number
  count?: number
  collectionName?: string
  sortBy?: SortType
  sortDirection?: SortDirection
}

// TODO: remove version param when pool is moved into loan optiom

/**
 * Finds one supported pool on the platform based on the specified filter.
 *
 * @param filter - See {@link FindOneFilter}.
 *
 * @returns The pool if there is a match, `undefined` otherwise.
 */
export async function findOnePool({
  address,
  collectionAddress,
  collectionId,
  blockchain = Blockchain.Ethereum(),
  includeRetired = false,
}: FindOneFilter = {}): Promise<Pool | undefined> {
  const filter: Record<string, any>[] = [
    {
      'collection.networkType': blockchain.network,
    },
    {
      'collection.networkId': parseInt(blockchain.networkId, 10),
    },
  ]

  if (collectionAddress !== undefined) {
    filter.push({
      'collection.address': collectionAddress,
    })
  }

  if (collectionId !== undefined) {
    const matches = collectionId.match(/(.*):(.*)/)
    const venue = matches?.[1] ?? ''
    const id = matches?.[2] ?? ''
    filter.push({
      'collection.vendorIds': {
        [venue]: id,
      },
    })
  }

  if (address !== undefined) {
    filter.push({
      address,
    })
  }

  if (address === undefined && !includeRetired) {
    filter.push({
      retired: {
        $ne: true,
      },
    })
  }

  const poolsData = await PoolModel.aggregate([
    {
      $lookup: {
        from: 'nftCollections',
        localField: 'nftCollection',
        foreignField: '_id',
        as: 'collection',
      },
    },
    {
      $unwind: '$collection',
    },
    {
      $match: {
        $and: filter,
      },
    },
  ]).exec()

  for (const pool of poolsData) {
    const poolContract = await getPoolContract({
      blockchain,
      poolAddress: pool.address,
    })
    return mapPool({
      version: poolContract.poolVersion,
      ...pool,
      collection: mapCollection(pool.collection),
      blockchain,
    })
  }
}

export async function countAllPools({
  collectionAddress,
  collectionId,
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  includeRetired = false,
  collectionName,
}: FindAllFilter = {}): Promise<number> {
  let count = 0
  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

    const filter: Record<string, any>[] = [
      {
        'collection.networkType': blockchain.network,
      },
      {
        'collection.networkId': parseInt(blockchain.networkId, 10),
      },
    ]

    if (collectionAddress !== undefined) {
      filter.push({
        'collection.address': collectionAddress,
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

    if (collectionId !== undefined) {
      const matches = collectionId.match(/(.*):(.*)/)
      const venue = matches?.[1] ?? ''
      const id = matches?.[2] ?? ''
      filter.push({
        'collection.vendorIds': {
          [venue]: id,
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

    const aggregation = PoolModel.aggregate([
      {
        $lookup: {
          from: 'nftCollections',
          localField: 'nftCollection',
          foreignField: '_id',
          as: 'collection',
        },
      },
      {
        $unwind: '$collection',
      },
      {
        $match: {
          $and: filter,
        },
      },
    ])

    const poolsCount = await aggregation.count('count').exec()
    count = poolsCount[0].count
  }
  return count
}

/**
 * Finds all pools on the platform. If the blockchain filter is specified, only pools residing in
 * the filtered blockchains will be returned.
 *
 * @param filter - See {@link FindAllFilter}.
 *
 * @returns Array of pools.
 */
export async function findAllPools({
  collectionAddress,
  collectionId,
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  includeRetired = false,
  offset,
  count,
  collectionName,
  sortBy,
  sortDirection = SortDirection.ASC,
}: FindAllFilter = {}): Promise<Pool[]> {
  const pools: Pool[] = []

  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

    const filter: Record<string, any>[] = [
      {
        'collection.networkType': blockchain.network,
      },
      {
        'collection.networkId': parseInt(blockchain.networkId, 10),
      },
    ]

    if (collectionAddress !== undefined) {
      filter.push({
        'collection.address': collectionAddress,
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

    if (collectionId !== undefined) {
      const matches = collectionId.match(/(.*):(.*)/)
      const venue = matches?.[1] ?? ''
      const id = matches?.[2] ?? ''
      filter.push({
        'collection.vendorIds': {
          [venue]: id,
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

    const stages: PipelineStage[] = [
      {
        $lookup: {
          from: 'nftCollections',
          localField: 'nftCollection',
          foreignField: '_id',
          as: 'collection',
        },
      },
      {
        $unwind: '$collection',
      },
      {
        $match: {
          $and: filter,
        },
      },
      {
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
      },
      {
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
        },
      })
      break
    case SortType.LTV:
      stages.push({
        $sort: {
          maxLTV: sortDirection === SortDirection.ASC ? 1 : -1,
        },
      })
      break
    }

    const aggregation = PoolModel.aggregate(stages)

    const poolsData =
      _.isNil(offset) || _.isNil(count)
        ? await aggregation.exec()
        : await aggregation.skip(offset).limit(count).exec()

    for (const pool of poolsData) {
      const poolContract = await getPoolContract({
        blockchain,
        poolAddress: pool.address,
      })
      pools.push(
        mapPool({
          version: poolContract.poolVersion,
          ...pool,
          collection: mapCollection(pool.collection),
          blockchain,
        })
      )
    }
  }
  return pools
}
