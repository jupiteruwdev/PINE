import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import getRequest from '../utils/getRequest'

type Params = {
  contractAddress: string
  blockchain: Blockchain
}

export default async function getFloorPrice({ contractAddress, blockchain }: Params): Promise<Record<string, any>> {
  try {
    logger.info(`Fetching floor price for contract <${contractAddress}> on network <${blockchain.networkId}>...`)
    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
    case Blockchain.Polygon.Network.MAIN:
      const apiHost = _.get(appConf.alchemyNFTAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain <${JSON.stringify(blockchain)}>`)
      const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

      const floorPrice = await getRequest(`${apiHost}${apiKey}/getFloorPrice`, {
        params: {
          contractAddress,
        },
      })

      return floorPrice
    default:
      const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
      logger.error(`Fetching floor price for contract <${contractAddress}>... ERR:`, err)
      throw err
    }
  }
  catch (err) {
    logger.info(`Fetching floor price for contract <${contractAddress}> on network <${blockchain.networkId}>... ERR`)
    throw fault('ERR_FETCHING_CONTRACT_FLOOR_PRICE', undefined, err)
  }
}
