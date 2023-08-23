import ERC20 from '../../abis/ERC20.json' assert { type: 'json' }
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  blockchain: Blockchain
  address: string
}

export default function getTokenContract({ blockchain, address }: Params) {
  try {
    if (!Blockchain.isEVMChain(blockchain)) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC20 as any, address)
    return contract
  }
  catch (err) {
    throw fault('ERR_GET_TOKEN_CONTRACT', undefined, err)
  }
}
