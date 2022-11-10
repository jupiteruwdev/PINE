import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import rethrow from '../../utils/rethrow'
import getRequest from '../utils/getRequest'

type Params = {
  blockchain: Blockchain
}

export default async function getSpamContracts({ blockchain }: Params): Promise<string[]> {
  const apiHost = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain <${JSON.stringify(blockchain)}>`)
  const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

  const res = await getRequest(`${apiHost}${apiKey}/getSpamContracts`, {})

  return res
}
