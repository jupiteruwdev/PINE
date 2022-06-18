import { $ETH, Blockchain, Value } from '../entities'
import { getPool } from '../subgraph/request'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

type SubgraphPool = {
  id: string
  totalUtilization: string
  collection: string
}

export default async function getPoolUtilization({ blockchain, poolAddress }: Params): Promise<Value> {
  switch (blockchain.network) {
  case 'ethereum': {
    const { pool }: { pool: SubgraphPool } = await getPool(poolAddress.toLowerCase())
    const web3 = getEthWeb3(blockchain.networkId)

    const totalUtilizationEth = web3.utils.fromWei(pool ? pool.totalUtilization : '0')

    return $ETH(totalUtilizationEth)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
