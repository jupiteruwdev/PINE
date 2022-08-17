import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { NFTCollectionModel, PoolModel } from '../../db'
import { mapPool } from '../../db/adapters'
import { Blockchain, Fee, Pool } from '../../entities'
import { getOnChainPoolByAddress } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import saveCollection from '../collections/saveCollection'
import authenticatePoolPublisher from './authenticatePoolPublisher'

type Params = {
  blockchain: Blockchain
  poolAddress: string
  payload: string
  signature: string
}

type SavePoolParams = {
  blockchain: Blockchain
  poolData: any
}

async function savePool({ poolData, blockchain }: SavePoolParams) {
  let collection = await NFTCollectionModel.findOne({
    address: poolData.collection.toLowerCase(),
  }).lean()

  if (collection === undefined) {
    collection = await saveCollection({ collectionAddress: poolData, blockchain })
  }

  const loanOptions = [
    {
      loanDurationBlock: poolData.duration / appConf.blocksPerSecond,
      loanDurationSecond: poolData.duration,
      interestBpsBlock: new BigNumber(poolData.interestBPS1000000XBlock).dividedBy(new BigNumber(1_000_000)),
      maxLtvBps: poolData.collateralFactorBPS,
    },
  ]

  const res = await PoolModel.create({
    retired: false,
    address: poolData.id,
    networkType: blockchain.network,
    networkId: blockchain.networkId,
    loanOptions,
    poolVersion: 2,
    lenderAddress: poolData.lenderAddress,
    routerAddress: _.get(appConf.routerAddress, blockchain.networkId),
    repayRouterAddress: _.get(appConf.repayRouterAddress, blockchain.networkId),
    rolloverAddress: _.get(appConf.rolloverAddress, blockchain.networkId),
    ethLimit: 0,
    nftCollection: collection?._id,
    defaultFees: appConf.defaultFees.map(fee => Fee.factory(fee)),
  })

  return mapPool({
    ...res.toObject(),
    loanOptions,
    collection,
  })
}

export default async function publishPool({
  blockchain,
  poolAddress,
  payload,
  signature,
}: Params): Promise<Pool> {
  logger.info(`Publishing pools for address <${poolAddress}>`)
  let pool: Pool
  try {
    switch (blockchain.network) {
    case 'ethereum':
      switch (blockchain.networkId) {
      case Blockchain.Ethereum.Network.MAIN:
        await authenticatePoolPublisher({ poolAddress, payload, signature, networkId: blockchain.networkId })
        const { pool: poolMainnet } = await getOnChainPoolByAddress({ poolAddress }, { networkId: blockchain.networkId })
        pool = await savePool({
          poolData: poolMainnet,
          blockchain,
        })
        break
      case Blockchain.Ethereum.Network.RINKEBY:
        await authenticatePoolPublisher({ poolAddress, payload, signature, networkId: blockchain.networkId })
        const { pool: poolRinkeby } = await getOnChainPoolByAddress({ poolAddress }, { networkId: blockchain.networkId })
        pool = await savePool({
          poolData: poolRinkeby,
          blockchain,
        })
        break
      default:
        throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
      }
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
