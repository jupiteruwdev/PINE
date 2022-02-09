import { EthNetwork } from '../utils/ethereum'
import Blockchain, { EthBlockchain } from './Blockchain'

type Currency = {
  address?: string
  blockchain: Blockchain
  name: 'ETH' | 'USDT'
}

export function $ETH(networkId: string | number = EthNetwork.MAIN): Currency {
  return {
    'blockchain': EthBlockchain(networkId),
    'name': 'ETH',
  }
}

export default Currency
