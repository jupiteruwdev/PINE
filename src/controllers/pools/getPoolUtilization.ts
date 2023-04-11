import { Blockchain, Value } from '../../entities'
import { getOnChainPoolByAddress } from '../../subgraph'
import fault from '../../utils/fault'
import getEthWeb3 from '../utils/getEthWeb3'

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
  case 'ethereum':
  case 'polygon': {
    const { pool }: { pool: SubgraphPool } = await getOnChainPoolByAddress({ poolAddress }, { networkId: blockchain.networkId })
    const web3 = getEthWeb3(blockchain.networkId)

    const totalUtilizationEth = web3.utils.fromWei(pool ? pool.totalUtilization : '0')

    return Value.$ETH(totalUtilizationEth)
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
