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
  const stages: PipelineStage[] = [{
    $match: {
      'networkType': blockchain.network,
      'networkId': blockchain.networkId,
      ...address === undefined ? {} : {
        'address': {
          $regex: address,
          $options: 'i',
        },
      },
      ...lenderAddress === undefined ? {} : {
        'lenderAddress': {
          $regex: lenderAddress,
          $options: 'i',
        },
      },
      ...includeRetired === true ? {} : {
        'retired': {
          $ne: true,
        },
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
  ...collectionAddress === undefined ? [] : [{
    $match: {
      'collection.address': {
        $regex: collectionAddress,
        $options: 'i',
      },
    },
  }], {
    $limit: 1,
  }]

  return stages
}
