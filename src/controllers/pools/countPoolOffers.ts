import _ from 'lodash'
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
}

export default async function countPoolOffers(params: Params = {}): Promise<number> {
  try {
    const aggregation = PoolModel.aggregate(getPipelineStages(params))
    let docs = await aggregation.exec()

    if (params.nftId !== undefined) {
      docs = await filterByNftId(Blockchain.parseBlockchain(params.blockchainFilter ?? {}), docs, params.nftId)
    }

    const poolOffers = _.reduce(docs, (pre, cur) => pre + _.get(cur, 'loanOptions', []).length, 0)

    return poolOffers
  }
  catch (err) {
    throw fault('ERR_COUNT_POOL_OFFERS', undefined, err)
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
}: Params): PipelineStage[] {
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
        '$or': blockchains.map(blockchain => ({
          $and: [
            { 'networkType': blockchain.network },
            { 'networkId': blockchain.networkId },
          ],
        })),
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
    }]]

    return stages
  }
  catch (err) {
    throw fault('ERR_COUNT_POOL_OFFERS_GET_PIPELINE_STAGES', undefined, err)
  }
}
