import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import postRequest from '../utils/postRequest'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'

type Params = {
  query: string
  blockchain: Blockchain
}

export default async function searchCollections({ query, blockchain }: Params): Promise<Collection[]> {
  logger.info(`Fetching collection by search text <${query}>...`)
  switch (blockchain.networkId) {
  case Blockchain.Ethereum.Network.MAIN:
    return DataSource.fetch(
      useAlchemy({ query, blockchain }),
      useGemXYZ({ query, blockchain }),
    )

  default:
    const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    logger.error(`Fetching collection for search text <${query}>... ERR:`, err)
    throw err
  }
}

function useAlchemy({ query, blockchain }: { query: string; blockchain: Blockchain }): DataSource<Collection[]> {
  return async () => {
    const apiKey = appConf.alchemyAPIKey
    const collectionData = await getRequest(_.get(appConf.alchemyAPIUrl, blockchain.networkId) + apiKey + '/searchContractMetadata',
      {
        params: {
          query,
        },
        timeout: 10000,
      })
    return collectionData.filter((cd: any) => cd?.contractMetadata?.tokenType === 'ERC721' && cd?.address && cd?.contractMetadata?.name && cd?.contractMetadata?.openSea?.collectionName).map((cd: any) => Collection.factory({
      address: cd?.address,
      blockchain,
      vendorIds: { opensea: cd?.contractMetadata?.openSea?.collectionName },
      name: cd?.contractMetadata?.name,
      imageUrl: cd?.contractMetadata?.imageUrl ?? '',
    }))
  }
}

function useGemXYZ({ query, blockchain }: { query: string; blockchain: Blockchain }): DataSource<Collection[]> {
  return async () => {
    const apiKey = appConf.gemxyzAPIKey
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
    const collections = _.get(collectionData, 'data')
    return collections.filter((cd: any) => cd.chainId === '1' && _.get(cd, 'addresses[0].address') && cd.name && cd.slug).map((cd: any) => Collection.factory({
      address: _.get(cd, 'addresses[0].address'),
      blockchain,
      vendorIds: { opensea: cd.slug },
      name: cd.name,
      imageUrl: cd.imageUrl ?? '',
    }))
  }
}
