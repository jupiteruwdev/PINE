import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { Blockchain } from '../../entities'
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

export default async function countPoolGroups(params: Params = {}): Promise<number> {
  const aggregation = PoolModel.aggregate(getPipelineStages(params))
  let docs = await aggregation.exec()

  if (params.nftId !== undefined) {
    docs = await filterByNftId(Blockchain.factory({
      network: 'ethereum',
      networkId: params.blockchainFilter?.ethereum,
    }), docs, params.nftId)
  }

  return docs.length
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
      $or: blockchains.map(blockchain => ({
        $and: [
          { 'networkType': blockchain.network },
          { 'networkId': blockchain.networkId },
        ],
      })),
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
  }],
  {
    $group: {
      _id: '$collection.address',
      groupValueLocked: {
        $sum: '$valueLockedEth',
      },
      pools: {
        $push: '$$ROOT',
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
  }]

  return stages
}
