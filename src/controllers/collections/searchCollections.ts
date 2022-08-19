import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import postRequest from '../utils/postRequest'

type Params = {
  query: string
  blockchain: Blockchain
}

export default async function searchCollections({ query, blockchain }: Params): Promise<Collection[]> {
  logger.info(`Fetching collection by search text <${query}>...`)
  const apiKey = appConf.gemxyzAPIKey

  switch (blockchain.networkId) {
  case Blockchain.Ethereum.Network.MAIN:
    const collectionData = await postRequest('https://gem-public-api.herokuapp.com/collections',
      {
        filters: { searchText: query },
        sort: { sevenDayVolume: -1 },
        limit: 10,
      },
      {
        headers: {
          'X-API-KEY': apiKey,
        },
      })
    const collections = _.get(collectionData, 'data')
    return collections.filter((cd: any) => cd.chainId === '1' && _.get(cd, 'addresses[0].address') && cd.name && cd.slug).map((cd: any) => Collection.factory({
      address: _.get(cd, 'addresses[0].address'),
      blockchain,
      vendorIds: { opensea: cd.slug },
      name: cd.name,
      imageUrl: cd.imageUrl ?? '',
    }))
  default:
    const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    logger.error(`Fetching collection for search text <${query}>... ERR:`, err)
    throw err
  }
}
