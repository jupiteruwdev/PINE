import { NFTCollectionModel, PoolModel } from '../../db'
import { mapPool } from '../../db/adapters'
import { Blockchain, Pool } from '../../entities'
import { getOnChainPoolByAddress } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import saveCollection from '../collections/saveCollection'

type Params = {
  blockchain: Blockchain
  poolAddress: string
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

  const res = await PoolModel.create({
    retired: false,
    address: poolData.id.toLowerCase(),
    networkType: blockchain.network,
    networkId: blockchain.networkId,
    loanOptions: [],
    poolVersion: 2,
    lenderAddress: poolData.lenderAddress.toLowerCase(),
    routerAddress: '',
    repayRouterAddress: '',
    rolloverAddress: '',
    ethLimit: 0,
    nftCollection: collection?._id,
  })

  return mapPool(res)
}

export default async function publishPool({
  blockchain,
  poolAddress,
}: Params): Promise<Pool> {
  logger.info(`Publishing pools for address <${poolAddress}>`)
  let pool: Pool
  try {
    switch (blockchain.network) {
    case 'ethereum':
      switch (blockchain.networkId) {
      case Blockchain.Ethereum.Network.MAIN:
        const { pool: poolMainnet } = await getOnChainPoolByAddress({ poolAddress }, { networkId: blockchain.networkId })
        pool = await savePool({
          poolData: poolMainnet,
          blockchain,
        })
        break
      case Blockchain.Ethereum.Network.RINKEBY:
        const { pool: poolRinkeby } = await getOnChainPoolByAddress({ poolAddress }, { networkId: blockchain.networkId })
        pool = await savePool({
          poolData: poolRinkeby,
          blockchain,
        })
        break
      default:
        throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
      }
      break;
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }

    return pool
  }
  catch (err) {
    throw fault('ERR_PUBLISH_POOL', undefined, err)
  }
}
