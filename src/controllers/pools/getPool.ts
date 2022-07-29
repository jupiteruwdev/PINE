import BigNumber from 'bignumber.js'
import { FilterQuery, PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { mapPool } from '../../db/adapters'
import { Blockchain, Pool, Value } from '../../entities'
import fault from '../../utils/fault'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'
import getUnpublishedPoolsByLenderAndAddress from './getUnpublishedPoolsByLenderAndAddress'

type Params<IncludeStats> = {
  blockchain: Blockchain
  collectionAddress?: string
  includeRetired?: boolean
  includeStats?: IncludeStats
  lenderAddress?: string
  address?: string
}

async function isPoolExist({
  address,
  blockchain,
  includeRetired = false,
  lenderAddress,
}: Params<never>): Promise<boolean> {
  const filter: FilterQuery<any> = {
    'networkType': blockchain.network,
    'networkId': parseInt(blockchain.networkId, 10),
  }
  if (address !== undefined) {
    filter.address = address
  }

  if (lenderAddress !== undefined) {
    filter.lenderAddress = lenderAddress
  }

  if (includeRetired !== undefined) {
    filter.retired = { $ne: true }
  }

  const isExist = await PoolModel.exists(filter).exec()
  return !!isExist
}

async function getPool<IncludeStats extends boolean = false>(params: Params<IncludeStats>): Promise<IncludeStats extends true ? Required<Pool> : Pool>
async function getPool<IncludeStats extends boolean = false>({
  blockchain,
  includeStats,
  ...params
}: Params<IncludeStats>): Promise<Pool> {
  const isExist = await isPoolExist({ ...params, blockchain })
  if (isExist) {
    const res = await PoolModel.aggregate(getPipelineStages({
      blockchain,
      ...params,
    })).exec()

    const pool = mapPool(res[0])

    if (includeStats !== true) return pool

    const [
      { amount: utilizationEth },
      { amount: capacityEth },
    ] = await Promise.all([
      getPoolUtilization({ blockchain, poolAddress: pool.address }),
      getPoolCapacity({ blockchain, poolAddress: pool.address }),
    ])

    const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(pool.ethLimit || Number.POSITIVE_INFINITY)) ? new BigNumber(pool.ethLimit ?? 0) : capacityEth.plus(utilizationEth)

    return {
      ...pool,
      utilization: Value.$ETH(utilizationEth),
      valueLocked: Value.$ETH(valueLockedEth),
    }
  }
  else {
    const unpublishedPools = await getUnpublishedPoolsByLenderAndAddress({
      address: params.address,
      lenderAddress: params.lenderAddress,
      blockchainFilter: {
        ethereum: blockchain.networkId,
      },
    })
    const pool = unpublishedPools[0]

    if (pool === undefined) {
      throw fault('ERR_UNKNOWN_POOL')
    }

    return pool
  }
}

export default getPool

function getPipelineStages({
  address,
  blockchain,
  collectionAddress,
  includeRetired = false,
  lenderAddress,
}: Params<never>): PipelineStage[] {
  const collectionFilter = [
    ...collectionAddress === undefined ? [] : [{
      'collection.address': collectionAddress,
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
      'networkId': parseInt(blockchain.networkId, 10),
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
    $match: {
      $and: collectionFilter,
    },
  }], {
    $limit: 1,
  }]

  return stages
}
