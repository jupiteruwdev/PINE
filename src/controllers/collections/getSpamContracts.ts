import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import getRequest from '../utils/getRequest'

type Params = {
  blockchain: Blockchain
}

export default async function getSpamContracts({ blockchain }: Params): Promise<string[]> {
  try {
    logger.info(`Fetching spam contracts on network <${blockchain.networkId}>...`)
    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const apiHost = _.get(appConf.alchemyNFTAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain <${JSON.stringify(blockchain)}>`)
      const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

      const res = await getRequest(`${apiHost}${apiKey}/getSpamContracts`, {})

      return res
    default:
      const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
      logger.error(`Fetching Fetching spam contracts on network <${blockchain.networkId}>... ERR:`, err)
      throw err
    }
  }
  catch (err) {
    logger.error(`Fetching spam contracts on network <${blockchain.networkId}>... ERR`)
    throw fault('ERR_FETCHING_SPAM_CONTRACTS', undefined, err)
  }
}
