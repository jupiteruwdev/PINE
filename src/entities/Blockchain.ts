import { EthNetwork } from '../utils/ethereum'

type Blockchain = {
  network: 'ethereum'
  network_id: string
}

export function EthBlockchain(networkId: string | number = EthNetwork.MAIN): Blockchain {
  return {
    'network': 'ethereum',
    'network_id': networkId.toString(),
  }
}

export default Blockchain
