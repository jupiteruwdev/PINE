import ControlPlaneABI from '../abis/ControlPlane.json'
import Blockchain from '../entities/lib/Blockchain'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'

type Params = {
  blockchain: Blockchain
  address: string
}

export default function getControlPlaneContract({ blockchain, address }: Params) {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    
    const contract = new web3.eth.Contract(ControlPlaneABI as any, address)
    return contract
    
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
