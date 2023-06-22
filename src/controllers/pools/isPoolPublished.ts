import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'

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
  try {
    const res = await PoolModel.aggregate(getPipelineStages({
      blockchain,
      ...params,
    })).exec()

    return !!res.length
  }
  catch (err) {
    throw fault('IS_POOL_PUBLISHED', undefined, err)
  }
}

export default isPoolPublished

function getPipelineStages({
  address,
  blockchain,
  collectionAddress,
  includeRetired = false,
  lenderAddress,
}: Params): PipelineStage[] {
  try {
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
  catch (err) {
    throw fault('ERR_IS_POOL_PUBLISHED_GET_PIPELINE_STAGES', undefined, err)
  }
}
