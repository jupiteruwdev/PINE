import ERC20 from '../abis/ERC20.json'
import { Blockchain } from '../entities'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'

type Params = {
  blockchain: Blockchain
  address: string
}

export default function getTokenContract({ blockchain, address }: Params) {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC20 as any, address)
    return contract
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
