import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { getWeb3 } from '../utils/ethereum'

export default async function getPoolCapacity(poolAddress: string, blockchain: Blockchain = EthBlockchain()): Promise<number> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getWeb3(blockchain.network_id)
    const balanceWei = await web3.eth.getBalance(poolAddress)
    const balanceEth = parseFloat(web3.utils.fromWei(balanceWei))

    return balanceEth
  }
  default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
