import { PoolModel } from '../../database'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'

type Params = {
  blockchain: Blockchain
}

async function getPublishedPoolAddresses({ blockchain }: Params): Promise<Record<string, any>[]> {
  try {
    const pools = await PoolModel.find({
      networkId: blockchain.networkId,
      networkType: blockchain.network,
    }).lean()

    return pools.map(pool => ({
      address: pool.address || '',
      version: pool.poolVersion,
      tokenAddress: pool.tokenAddress,
      fundSource: pool.fundSource,
      ethLimit: pool.ethLimit?.toString() ?? '0',
    }))
  }
  catch (err) {
    throw fault('ERR_GET_PUBLISHED_POOL_ADDRESSES', undefined, err)
  }
}

export default getPublishedPoolAddresses
