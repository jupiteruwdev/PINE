import _ from 'lodash'
import appConf from '../../app.conf'
import { NFTCollectionModel, PoolModel } from '../../database'
import { Blockchain, Pool } from '../../entities'
import { getOnChainPoolByAddress } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { mapPool } from '../adapters'
import saveCollection from '../collections/saveCollection'
import authenticatePoolPublisher from './authenticatePoolPublisher'
import syncPools from './syncPools'

type Params = {
  blockchain: Blockchain
  poolAddress: string
  payload: string
  signature: string
  ethLimit: number
}

type SavePoolParams = {
  blockchain: Blockchain
  poolData: any
  ethLimit: number
}

async function savePool({ poolData, blockchain, ethLimit }: SavePoolParams) {
  try {
    let [collection] = await NFTCollectionModel.find({
      address: {
        '$regex': poolData.collection,
        '$options': 'i',
      },
      sftMarketId: poolData.sftMarketId,
      matcher: null,
    }).lean()

    if (collection === undefined) {
      collection = await saveCollection({ collectionAddress: poolData.collection, blockchain, sftMarketId: poolData.sftMarketId })
    }

    syncPools()

    const pool = await PoolModel.findOneAndUpdate({
      address: poolData.id,
      retired: true,
    }, {
      $set: {
        address: poolData.id,
        networkType: blockchain.network,
        networkId: blockchain.networkId,
        tokenAddress: poolData.supportedCurrency,
        fundSource: poolData.fundSource,
        poolVersion: 4,
        lenderAddress: poolData.lenderAddress,
        routerAddress: _.get(appConf.routerAddress, blockchain.networkId),
        repayRouterAddress: _.get(appConf.repayRouterAddress, blockchain.networkId),
        rolloverAddress: _.get(appConf.rolloverAddress, blockchain.networkId),
        ethLimit,
        nftCollection: collection?._id,
        defaultFees: [],
        retired: false,
      },
    }, {
      returnDocument: 'after',
      upsert: true,
    }).exec()

    return mapPool({
      ...pool.toObject(),
      collection,
    })
  }
  catch (err) {
    throw fault('ERR_PUBLISH_POOL_SAVE_POOL', undefined, err)
  }
}

export default async function publishPool({
  blockchain,
  poolAddress,
  payload,
  signature,
  ethLimit,
}: Params): Promise<Pool> {
  logger.info(`Publishing pools for address <${poolAddress}>`)
  let pool: Pool
  try {
    if (!Blockchain.isEVMChain(blockchain)) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
    case Blockchain.Polygon.Network.MAIN:
    case Blockchain.Arbitrum.Network.MAINNET:
    case Blockchain.Avalanche.Network.MAINNET:
      // await authenticatePoolPublisher({ poolAddress, payload, signature, networkId: blockchain.networkId })
      const { pool: poolMainnet } = await getOnChainPoolByAddress({ poolAddress }, { networkId: blockchain.networkId })
      pool = await savePool({
        poolData: poolMainnet,
        blockchain,
        ethLimit,
      })
      break
    case Blockchain.Ethereum.Network.GOERLI:
    case Blockchain.Polygon.Network.MUMBAI:
      await authenticatePoolPublisher({ poolAddress, payload, signature, networkId: blockchain.networkId })
      const { pool: poolRinkeby } = await getOnChainPoolByAddress({ poolAddress }, { networkId: blockchain.networkId })
      pool = await savePool({
        poolData: poolRinkeby,
        blockchain,
        ethLimit,
      })
      break
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }

    return pool
  }
  catch (err) {
    throw fault('ERR_PUBLISH_POOL', undefined, err)
  }
}
