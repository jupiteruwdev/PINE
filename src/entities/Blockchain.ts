import { EthNetwork } from '../utils/ethereum'

export type AnyBlockchain = 'ethereum'

type Blockchain<T extends AnyBlockchain = AnyBlockchain> = {
  network: T
  networkId: string
}

export function EthBlockchain(networkId: string | number = EthNetwork.MAIN): Blockchain<'ethereum'> {
  return {
    network: 'ethereum',
    networkId: networkId.toString(),
  }
}

export default Blockchain
