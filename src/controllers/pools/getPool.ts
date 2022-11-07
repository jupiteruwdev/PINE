import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import appConf from '../../app.conf'
import { PoolModel } from '../../db'
import { Blockchain, Collection, Fee, LoanOption, Pool, Value } from '../../entities'
import { getOnChainPools } from '../../subgraph'
import fault from '../../utils/fault'
import { mapPool } from '../adapters'
import getEthCollectionMetadata from '../collections/getEthCollectionMetadata'
import getOnChainLoanOptions from './getOnChainLoanOptions'
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
    for (const resPool of res) {
      const pool = mapPool(resPool)
      if (_.isString(_.get(pool, 'collection.matcher.regex')) && _.isString(_.get(pool, 'collection.matcher.fieldPath'))) {
        const regex = new RegExp(pool.collection.matcher.regex)
        if (!regex.test(_.get(nftProps, pool.collection.matcher.fieldPath))) {
          continue
        }
      }
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
        getPoolCapacity({ blockchain, poolAddress: pool.address, tokenAddress: pool.tokenAddress, fundSource: pool.fundSource }),
      ])

      const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(pool.ethLimit || Number.POSITIVE_INFINITY)) ? new BigNumber(pool.ethLimit ?? 0) : capacityEth.plus(utilizationEth)
      if (!!pool.collection?.valuation && pool.ethLimit !== 0 && pool.loanOptions.some(option => utilizationEth.plus(pool.collection.valuation ?? new BigNumber(0)).gt(new BigNumber(pool.ethLimit ?? 0)))) continue
      return {
        ...pool,
        utilization: Value.$ETH(utilizationEth),
        valueLocked: Value.$ETH(valueLockedEth),
      }
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

  const collectionMetadata = await getEthCollectionMetadata({ blockchain, matchSubcollectionBy: { type: 'poolAddress', value: pool.id }, collectionAddress: pool.collection })
  const loanOptionsDict = await getOnChainLoanOptions({ addresses: [pool.id], networkId: blockchain.networkId })

  return Pool.factory({
    version: 2,
    address: pool.id,
    blockchain,
    ...pool,
    tokenAddress: pool.supportedCurrency,
    fundSource: pool.fundSource,
    collection: Collection.factory({
      address: pool.collection,
      blockchain,
      ...collectionMetadata,
    }),
    loanOptions: loanOptionsDict[pool.id]?.map((lo: any) => LoanOption.factory({
      interestBPSPerBlock: lo.interestBpsBlock,
      loanDurationBlocks: lo.loanDurationSecond / appConf.blocksPerSecond,
      loanDurationSeconds: lo.loanDurationSecond,
      maxLTVBPS: lo.maxLtvBps,
      fees: appConf.defaultFees.map(fee => Fee.factory(fee)),
    })) || [],
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
  const stages: PipelineStage[] = [{
    $match: {
      'networkType': blockchain.network,
      'networkId': blockchain.networkId,
      ...address === undefined ? {} : {
        address: {
          $regex: address,
          $options: 'i',
        },
      },
      ...lenderAddress === undefined ? {} : {
        lenderAddress: {
          $regex: lenderAddress,
          $options: 'i',
        },
      },
      ...includeRetired === true ? {} : {
        retired: {
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
    $sort: {
      'loanOptions.interestBpsBlock': 1,
    },
  }, {
    $limit: 1,
  }]

  return stages
}
