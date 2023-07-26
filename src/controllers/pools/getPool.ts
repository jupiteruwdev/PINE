import { ethers } from 'ethers'
import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import appConf from '../../app.conf'
import { PoolModel } from '../../db'
import { Blockchain, Collection, Fee, LoanOption, Pool, Value } from '../../entities'
import { getOnChainPools } from '../../subgraph'
import fault from '../../utils/fault'
import { mapPool } from '../adapters'
import getEthCollectionMetadata from '../collections/getEthCollectionMetadata'
import getPoolEthLimit from '../contracts/getPoolEthLimit'
import getOnChainLoanOptions from './getOnChainLoanOptions'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'
import verifyPool from './verifyPool'

type Params = {
  blockchain: Blockchain
  collectionAddress?: string
  includeRetired?: boolean
  lenderAddress?: string
  address?: string
  nft?: {
    id?: string
    name?: string
  }
}

async function getPool({
  blockchain,
  nft,
  ...params
}: Params): Promise<Pool> {
  try {
    const res = await PoolModel.aggregate(getPipelineStages({
      blockchain,
      ...params,
    })).exec()

    if (res.length) {
      for (const resPool of res) {
        const pool = mapPool(resPool)
        if (nft && _.isString(_.get(resPool, 'collection.matcher.regex')) && _.isString(_.get(resPool, 'collection.matcher.fieldPath'))) {
          const regex = new RegExp(resPool.collection.matcher.regex)
          if (!regex.test(_.get(nft, resPool.collection.matcher.fieldPath))) {
            continue
          }
        }
        try {
          await verifyPool({ blockchain, address: pool.address, collectionAddress: pool.collection.address })
        }
        catch (err) {
          throw fault('ERR_ZOMBIE_POOL', undefined, err)
        }

        return pool
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
    const [
      { amount: utilizationEth },
      { amount: capacityEth },
      maxLoanLimit,
    ] = await Promise.all([
      getPoolUtilization({ blockchain, poolAddress: pool.id }),
      getPoolCapacity({ blockchain, poolAddress: pool.id, tokenAddress: pool.supportedCurrency, fundSource: pool.fundSource }),
      getPoolEthLimit({ blockchain, poolAddress: pool.id }),
    ])
    const ethLimit = _.toNumber(ethers.utils.formatEther(maxLoanLimit ?? pool.maxLoanLimit ?? '0'))
    const valueLockedEth = capacityEth.plus(utilizationEth)

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
      ethLimit,
      published: false,
      utilization: Value.$ETH(utilizationEth),
      valueLocked: Value.$ETH(valueLockedEth),
    })
  }
  catch (err) {
    throw fault('ERR_GET_POOL', undefined, err)
  }
}

export default getPool

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
    }]

    return stages
  }
  catch (err) {
    throw fault('ERR_GET_POOL_GET_PIPELINE_STAGES', undefined, err)
  }
}
