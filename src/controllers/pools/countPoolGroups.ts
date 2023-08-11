import { PipelineStage } from 'mongoose'
import appConf from '../../app.conf'
import { PoolModel } from '../../database'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import Tenor from '../utils/Tenor'
import { filterByNftId } from './searchPublishedPools'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  collectionName?: string
  includeRetired?: boolean
  address?: string
  lenderAddress?: string
  tenors?: number[]
  nftId?: string
  filters?: string
}

export default async function countPoolGroups(params: Params = {}): Promise<number> {
  try {
    const aggregation = PoolModel.aggregate(getPipelineStages(params))
    let docs = await aggregation.exec()

    if (params.nftId !== undefined) {
      docs = await filterByNftId(Blockchain.parseBlockchain(params.blockchainFilter ?? {}), docs, params.nftId)
    }

    return docs.length
  }
  catch (err) {
    throw fault('ERR_COUNT_POOL_GROUPS', undefined, err)
  }
}

function getPipelineStages({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
    polygon: Blockchain.Polygon.Network.MAIN,
  },
  collectionAddress,
  collectionName,
  includeRetired = false,
  address,
  lenderAddress,
  tenors,
  filters,
}: Params): PipelineStage[] {
  try {
    const blockchains = Blockchain.fromFilter(blockchainFilter)
    console.log({ blockchains })

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
      ...filters?.includes('solv') ? [{
        'collection.sftMarketId': {
          $ne: null,
        },
      }] : [],
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
        ...blockchains?.length ? {
          '$or': blockchains.map(blockchain => ({
            $and: [
              { 'networkType': blockchain.network },
              { 'networkId': blockchain.networkId },
            ],
          })) } : {},
        ...lenderAddress === undefined ? {} : { lenderAddress },
        ...includeRetired === true ? {} : { retired: { $ne: true } },
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
    }],
    ...poolFilter.length === 0 ? [] : [{
      $match: { $and: poolFilter },
    }],
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
    }]

    return stages

  }
  catch (err) {
    throw fault('ERR_COUNT_POOL_GROUPS_GET_PIPELINE_STAGES', undefined, err)
  }
}
