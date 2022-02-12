import Blockchain from '../entities/Blockchain'
import Value, { $ETH } from '../entities/Value'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolCapacity({ blockchain, poolAddress }: Params): Promise<Value> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const balanceWei = await web3.eth.getBalance(poolAddress)
    const balanceEth = parseFloat(web3.utils.fromWei(balanceWei))

    return $ETH(balanceEth)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
