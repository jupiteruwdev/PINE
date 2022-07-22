import BigNumber from 'bignumber.js'
import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { mapPool } from '../../db/adapters'
import { Blockchain, Pool, Value } from '../../entities'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

type Params<IncludeStats> = {
  blockchain: Blockchain
  collectionAddress?: string
  includeRetired?: boolean
  includeStats?: IncludeStats
  lenderAddress?: string
  address?: string
}

async function getPool<IncludeStats extends boolean = false>(params: Params<IncludeStats>): Promise<IncludeStats extends true ? Required<Pool> : Pool>
async function getPool<IncludeStats extends boolean = false>({
  blockchain,
  collectionAddress,
  includeRetired = false,
  includeStats,
  lenderAddress,
  address,
}: Params<IncludeStats>): Promise<Pool> {
  const res = await PoolModel.aggregate(getPipelineStages({
    blockchain,
    collectionAddress,
    includeRetired,
    lenderAddress,
    address,
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

export default getPool

function getPipelineStages({
  blockchain,
  collectionAddress,
  includeRetired = false,
  lenderAddress,
  address,
}: Params<never>): PipelineStage[] {
  const filter: Record<string, any>[] = [{
    'collection.networkType': blockchain.network,
  }, {
    'collection.networkId': parseInt(blockchain.networkId, 10),
  }]

  if (collectionAddress !== undefined) {
    filter.push({
      'collection.address': collectionAddress,
    })
  }

  if (lenderAddress !== undefined) {
    filter.push({
      lenderAddress,
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

  const stages: PipelineStage[] = [{
    $lookup: {
      from: 'nftCollections',
      localField: 'nftCollection',
      foreignField: '_id',
      as: 'collection',
    },
  }, {
    $unwind: '$collection',
  }, {
    $match: {
      $and: filter,
    },
  }, {
    $limit: 1,
  }]

  return stages
}
