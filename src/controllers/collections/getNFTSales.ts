import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import rethrow from '../../utils/rethrow'
import getRequest from '../utils/getRequest'

type Params = {
  contractAddress: string
  blockchain: Blockchain
  marketplace?: string
  tokenId?: string
  buyerAddress?: string
  sellerAddress?: string
}

export default async function getNFTSales({ contractAddress, blockchain, ...props }: Params): Promise<Record<string, any>> {
  const apiHost = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain <${JSON.stringify(blockchain)}>`)
  const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

  const res = await getRequest(`${apiHost}${apiKey}/getNFTSales`, {
    params: {
      contractAddress,
      ...props,
    },
  })

  return res
}
