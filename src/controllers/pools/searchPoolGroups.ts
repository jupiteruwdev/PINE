import BigNumber from 'bignumber.js'
import { PipelineStage } from 'mongoose'
import appConf from '../../app.conf'
import { PoolModel } from '../../database'
import { Blockchain, NFT, Pool, PoolGroup, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { mapPool } from '../adapters'
import { getNFTsByOwner } from '../collaterals'
import Tenor from '../utils/Tenor'
import getTokenUSDPrice, { AvailableToken } from '../utils/getTokenUSDPrice'
import { PoolSortDirection, PoolSortType } from './searchPublishedPools'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  ownerAddress?: string
  offset?: number
  count?: number
  collectionName?: string
  ethOneValueUSD?: Value
  ethTwoValueUSD?: Value
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
  try {
    const aggregation = PoolModel.aggregate(getPipelineStages({
      ...params,
    }))

    const docs = paginateBy === undefined ? await aggregation.exec() : await aggregation.skip(paginateBy.offset).limit(paginateBy.count).exec()

    return docs.map(doc => doc.pools.map(mapPool))
  }
  catch (err) {
    throw fault('ERR_SEARCH_PUBLISHED_POOL_GROUPS', undefined, err)
  }
}

function getPipelineStages({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
    polygon: Blockchain.Polygon.Network.MAIN,
  },
  ethOneValueUSD,
  ethTwoValueUSD,
  collectionAddress,
  collectionName,
  sortBy,
}: Params = {}): PipelineStage[] {
  try {
    const blockchains = Blockchain.fromFilter(blockchainFilter)

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
        '$or': blockchains.map(blockchain => ({
          $and: [
            { 'networkType': blockchain.network },
            { 'networkId': blockchain.networkId },
          ],
        })),
        'valueLockedEth': {
          $gte: 0.01,
        },
      },
    }, {
      $addFields: {
        loanOptions: {
          $filter: {
            input: '$loanOptions',
            as: 'loanOption',
            cond: {
              $or: [
                ...Tenor.convertTenors(appConf.tenors).map(seconds => ({
                  $eq: ['$$loanOption.loanDurationSecond', seconds],
                })),
              ],
            },
          },
        },
      },
    }, {
      $match: {
        'loanOptions.0': {
          $exists: true,
        },
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
        valueLockedUSD: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$networkId', '1'] },
                then: { $multiply: ['$valueLockedEth', ethOneValueUSD?.amount.toNumber()] },
              },
              {
                case: { $eq: ['$networkId', '137'] },
                then: { $multiply: ['$valueLockedEth', ethTwoValueUSD?.amount.toNumber()] },
              },
            ],
            default: { $multiply: ['$valueLockedEth', ethOneValueUSD?.amount.toNumber()] },
          },
        },
      },
    },
    {
      $group: {
        _id: '$collection.address',
        groupValueLockedUSD: {
          $sum: '$valueLockedUSD',
        },
        groupValueLocked: {
          $sum: '$valueLockedEth',
        },
        groupUtilization: {
          $sum: '$utilizationEth',
        },
        groupLowestARP: {
          $min: '$lowestAPR',
        },
        groupMaxLTV: {
          $max: '$maxLTV',
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
          'groupLowestARP': sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
          'pools.name': 1,
        },
      })
      break
    case PoolSortType.LTV:
      stages.push({
        $sort: {
          'groupMaxLTV': sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
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
    case PoolSortType.TVL:
      stages.push({
        $sort: {
          'groupValueLockedUSD': sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
          'pools.name': 1,
        },
      })
      break
    case PoolSortType.BORROWING:
      stages.push({
        $sort: {
          'groupLowestARP': sortBy?.direction === PoolSortDirection.DESC ? 1 : -1,
          'pools.name': 1,
        },
      })
      break
    }

    return [
      ...stages,
    ]
  }
  catch (err) {
    throw fault('ERR_SEARCH_POOL_GROUPS_GET_PIPELINE_STAGES', undefined, err)
  }
}

export default async function searchPoolGroups({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
    polygon: Blockchain.Polygon.Network.MAIN,
  },
  ownerAddress,
  collectionAddress,
  collectionName,
  paginateBy,
  sortBy,
}: Params) {
  logger.info('Searching pool groups...')

  try {
    const blockchain = Blockchain.parseBlockchain(blockchainFilter)
    const polygon = Blockchain.parseBlockchain({ polygon: '137' })
    const [ethOneValueUSD, ethTwoValueUSD] = await Promise.all([
      getTokenUSDPrice(Blockchain.parseNativeToken(blockchain) as AvailableToken),
      getTokenUSDPrice(Blockchain.parseNativeToken(polygon) as AvailableToken),
    ])

    const groups = await searchPublishedPoolGroups({
      blockchainFilter,
      collectionAddress,
      collectionName,
      ethOneValueUSD,
      ethTwoValueUSD,
      paginateBy,
      sortBy,
    })

    let nfts: NFT[] = []

    if (ownerAddress) {
      nfts = await getNFTsByOwner({
        blockchain,
        ownerAddress,
        collectionAddress,
        populateMetadata: true,
      })
    }

    const pools = groups as Required<Pool>[][]

    const poolGroups = pools.map((group: Required<Pool>[]) => {
      let ethValueUSD: Value
      if (group[0].blockchain.network === 'polygon') ethValueUSD = ethTwoValueUSD
      else ethValueUSD = ethOneValueUSD
      return PoolGroup.factory({
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
      })
    })

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

    throw fault('ERR_SERACH_POOL_GROUPS', undefined, err)
  }
}
