import ERC20 from '../../abis/ERC20.json' assert { type: 'json' }
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import getEthWeb3 from '../utils/getEthWeb3'

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
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
