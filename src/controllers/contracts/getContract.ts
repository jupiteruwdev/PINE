import { Contract } from 'web3-eth-contract'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  blockchain: Blockchain
  address: string
  abi: any[]
}

export default function getContract({ blockchain, address, abi }: Params): Contract {
  try {
    switch (blockchain.network) {
    case 'ethereum':
    case 'polygon': {
      const web3 = getEthWeb3(blockchain.networkId)
      const contract: Contract = new web3.eth.Contract(abi as any, address)
      return contract
    }
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    throw fault('ERR_GET_POOL_CONTRACT', undefined, err)
  }
}
