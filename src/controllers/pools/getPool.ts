import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import appConf from '../../app.conf'
import { PoolModel } from '../../db'
import { mapPool } from '../../db/adapters'
import { Blockchain, Collection, Fee, LoanOption, Pool, Value } from '../../entities'
import { getOnChainPools } from '../../subgraph'
import fault from '../../utils/fault'
import getEthCollectionMetadata from '../collections/getEthCollectionMetadata'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'
import verifyPool from './verifyPool'

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
  includeStats,
  ...params
}: Params<IncludeStats>): Promise<Pool> {
  const res = await PoolModel.aggregate(getPipelineStages({
    blockchain,
    ...params,
  })).exec()

  if (res.length) {
    const pool = mapPool(res[0])

    try {
      await verifyPool({ blockchain, address: pool.address, collectionAddress: pool.collection.address })
    }
    catch (err) {
      throw fault('ERR_ZOMBIE_POOL', undefined, err)
    }

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

  const unpublishedPools = await getOnChainPools({
    address: params.address,
    lenderAddress: params.lenderAddress,
    collectionAddress: params.collectionAddress,
  }, { networkId: blockchain.networkId })

  const pool = unpublishedPools.pools[0]

  if (pool === undefined) {
    throw fault('ERR_UNKNOWN_POOL')
  }

  const collectionMetadata = await getEthCollectionMetadata({ blockchain, poolAddress: pool.id, collectionAddress: pool.collection })

  return Pool.factory({
    version: 2,
    address: pool.id,
    blockchain,
    ...pool,
    collection: Collection.factory({
      address: pool.collection,
      blockchain,
      ...collectionMetadata,
    }),
    loanOptions: [
      LoanOption.factory({
        loanDurationSeconds: pool.duration,
        interestBPSPerBlock: pool.interestBPS1000000XBlock / 1_000_000,
        maxLTVBPS: pool.collateralFactorBPS,
        fees: appConf.defaultFees.map(fee => Fee.factory(fee)),
        loanDurationBlocks: pool.duration / appConf.blocksPerSecond,
      }),
    ],
    routerAddress: _.get(appConf.routerAddress, blockchain.networkId),
    repayRouterAddress: _.get(appConf.repayRouterAddress, blockchain.networkId),
    rolloverAddress: _.get(appConf.rolloverAddress, blockchain.networkId),
    ethLimit: 0,
    published: false,
  })
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
