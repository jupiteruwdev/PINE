import ERC721 from '../../abis/ERC721.json' assert { type: 'json' }
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  blockchain: Blockchain
  address: string
}

export default function getTokenContract({ blockchain, address }: Params) {
  try {
    switch (blockchain.network) {
    case 'ethereum':
    case 'polygon': {
      const web3 = getEthWeb3(blockchain.networkId)
      const contract = new web3.eth.Contract(ERC721 as any, address)
      return contract
    }
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    throw fault('ERR_GET_TOKEN_CONTRACT', undefined, err)
  }
}
