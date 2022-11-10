import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import postRequest from '../utils/postRequest'
import getNFTSales from './getNFTSales'
import getSpamContracts from './getSpamContracts'

type Params = {
  query: string
  blockchain: Blockchain
}

export default async function searchCollections({ query, blockchain }: Params): Promise<Collection[]> {
  logger.info(`Fetching collection by search text <${query}>...`)
  const apiKey = appConf.gemxyzAPIKey

  switch (blockchain.networkId) {
  case Blockchain.Ethereum.Network.MAIN:
    const collectionData = await postRequest('https://gem-public-api-v2.herokuapp.com/collections',
      {
        filters: { searchText: query },
        sort: { sevenDayVolume: -1 },
        limit: 10,
      },
      {
        headers: {
          'X-API-KEY': apiKey,
        },
        timeout: 10000,
      })
    console.log({ collectionData })
    const collections = _.get(collectionData, 'data')
    const spamContracts = await getSpamContracts({ blockchain })
    const nonSpamCollections = collections.filter((cd: any) => cd.chainId === '1' && _.get(cd, 'addresses[0].address') && cd.name && cd.slug && spamContracts.includes(_.get(cd, 'addresses[0].address'))).map((cd: any) => Collection.factory({
      address: _.get(cd, 'addresses[0].address'),
      blockchain,
      vendorIds: { opensea: cd.slug },
      name: cd.name,
      imageUrl: cd.imageUrl ?? '',
    }))

    const pomises = await Promise.all([
      ...nonSpamCollections.map((collection: Collection) => getNFTSales({ blockchain, contractAddress: collection.address })),
    ])

    console.log({ pomises })

    // nonSpamCollections.map((collection, index) => {

    // })

    return nonSpamCollections

  default:
    const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    logger.error(`Fetching collection for search text <${query}>... ERR:`, err)
    throw err
  }
}
