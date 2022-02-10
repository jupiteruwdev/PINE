import { EthNetwork } from '../utils/ethereum'

type Blockchain = {
  network: 'ethereum'
  networkId: string
}

export function EthBlockchain(networkId: string | number = EthNetwork.MAIN): Blockchain {
  return {
    network: 'ethereum',
    networkId: networkId.toString(),
  }
}

export default Blockchain
