import Blockchain from '../entities/lib/Blockchain'
import Value, { $ETH } from '../entities/lib/Value'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolCapacity({ blockchain, poolAddress }: Params): Promise<Value> {
  switch (blockchain.network) {
  case 'ethereum': {
    try {
      const web3 = getEthWeb3(blockchain.networkId)
      const balanceWei = await web3.eth.getBalance(poolAddress)
      const balanceEth = web3.utils.fromWei(balanceWei)

      return $ETH(balanceEth)
    }
    catch (err) {
      throw failure('FETCH_ETH_BALANCE_FAILURE', err)
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
