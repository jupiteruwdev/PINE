import { PoolModel } from '../../db'
import { Blockchain } from '../../entities'

type Params = {
  blockchain: Blockchain
}

async function getPublishedPoolAddresses({ blockchain }: Params): Promise<Record<string, any>[]> {
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

export default getPublishedPoolAddresses
