import { Blockchain } from '../entities'

export function convertToMoralisChain(networkId: string) {
  switch (networkId) {
  case Blockchain.Ethereum.Network.MAIN:
    return 'eth'
  case Blockchain.Ethereum.Network.GOERLI:
    return 'goerli'
  case Blockchain.Polygon.Network.MAIN:
    return 'polygon'
  case Blockchain.Polygon.Network.MUMBAI:
    return 'mumbai'
  case Blockchain.Arbitrum.Network.MAINNET:
    return 'arbitrum'
  case Blockchain.Avalanche.Network.MAINNET:
    return 'avalanche'
  }
}
