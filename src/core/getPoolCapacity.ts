import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Currency, { $ETH } from '../entities/Currency'
import { getWeb3 } from '../utils/ethereum'

type Params = {
  poolAddress: string
}

export default async function getPoolCapacity({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<{ value: number, currency: Currency }> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getWeb3(blockchain.network_id)
    const balanceWei = await web3.eth.getBalance(poolAddress)
    const balanceEth = parseFloat(web3.utils.fromWei(balanceWei))

    return {
      value: balanceEth,
      currency: $ETH(blockchain.network_id),
    }
  }
  default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
