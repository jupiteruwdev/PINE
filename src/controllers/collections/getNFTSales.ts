import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { useReservoirSales } from '../utils/useReservoirAPI'

type Params = {
  contractAddress: string
  blockchain: Blockchain
  tokenId?: string
}

export default async function getNFTSales({ contractAddress, blockchain, ...props }: Params): Promise<Record<string, any>> {
  try {
    logger.info(`Fetching nft sales for contract <${contractAddress}> on network <${blockchain.networkId}>...`)
    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
    case Blockchain.Polygon.Network.MAIN:
    case Blockchain.Arbitrum.Network.MAINNET:
    case Blockchain.Avalanche.Network.MAINNET:
      const salesInfo = await useReservoirSales({ collectionAddress: contractAddress, blockchain, ...props })

      return salesInfo.sales
    default:
      const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
      logger.error(`Fetching nft sales for contract <${contractAddress}>... ERR:`, err)
      throw err
    }
  }
  catch (err) {
    logger.info(`Fetching nft sales for contract <${contractAddress}> on network <${blockchain.networkId}>... ERR`)
    throw fault('ERR_FETCHING_CONTRACT_FLOOR_PRICE', undefined, err)
  }

}
