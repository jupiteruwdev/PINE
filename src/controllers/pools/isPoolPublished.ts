import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { Blockchain } from '../../entities'

type Params = {
  blockchain: Blockchain
  collectionAddress?: string
  includeRetired?: boolean
  lenderAddress?: string
  address?: string
}

async function isPoolPublished({
  blockchain,
  ...params
}: Params): Promise<boolean> {
  const res = await PoolModel.aggregate(getPipelineStages({
    blockchain,
    ...params,
  })).exec()

  return !!res.length
}

export default isPoolPublished

function getPipelineStages({
  address,
  blockchain,
  collectionAddress,
  includeRetired = false,
  lenderAddress,
}: Params): PipelineStage[] {
  const collectionFilter = [
    ...collectionAddress === undefined ? [] : [{
      'collection._address': collectionAddress,
    }],
  ]

  const stages: PipelineStage[] = [{
    $addFields: {
      '_address': {
        $toLower: '$address',
      },
    },
  }, {
    $match: {
      'networkType': blockchain.network,
      'networkId': blockchain.networkId,
      ...address === undefined ? {} : { _address: address.toLowerCase() },
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
      'collection._address': { $toLower: '$collection.address' },
    },
  }, {
    $match: {
      $and: collectionFilter,
    },
  }], {
    $limit: 1,
  }]

  return stages
}
