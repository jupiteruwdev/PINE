import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../app.conf'
import { findOne as findOneCollection } from '../db/collections'
import { $ETH, Blockchain, EthereumNetwork, Valuation } from '../entities'
import failure from '../utils/failure'
import getRequest from '../utils/getRequest'
import logger from '../utils/logger'
import getEthCollectionFloorPrice from './getEthCollectionFloorPrice'

type Params = {
  blockchain: Blockchain<'ethereum'>
  collectionAddress: string
}

export default async function getEthCollectionValuation({ blockchain, collectionAddress }: Params): Promise<Valuation> {
  logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>...`)

  const collection = await findOneCollection({ blockchain, address: collectionAddress })
  if (!collection) throw failure('UNSUPPORTED_COLLECTION')

  switch (blockchain.networkId) {
  case EthereumNetwork.MAIN:
    const matches = collection.id.match(/(.*):(.*)/)
    const venue = matches?.[1]
    const id = matches?.[2]

    if (!venue || !id) throw failure('UNSUPPORTED_COLLECTION')

    switch (venue) {
    case 'opensea':
      try {
        const apiKey = appConf.openseaAPIKey
        if (!apiKey) throw failure('FETCH_OPENSEA_VALUATION_FAILURE')

        const [collectionData] = await Promise.all([
          getRequest(`https://api.opensea.io/api/v1/collection/${id}/stats`, {
            headers: {
              'X-API-KEY': apiKey,
            },
          }),
        ])

        const floorPrice = new BigNumber(_.get(collectionData, 'stats.floor_price'))
        const value24Hr = new BigNumber(_.get(collectionData, 'stats.one_day_average_price'))
        const value = floorPrice.gt(value24Hr) ? value24Hr : floorPrice
        const valuation: Valuation<'ETH'> = {
          collection,
          value: $ETH(value),
          value24Hr: $ETH(value24Hr),
          value1DReference: $ETH(0),
        }

        logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>... OK`, valuation)

        return valuation
      }
      catch (err) {
        logger.error(`Fetching valuation for Ethereum collection <${collectionAddress}>... ERR`, err)

        throw failure('FETCH_OPENSEA_VALUATION_FAILURE', err)
      }
    default:
      throw failure('UNSUPPORTED_MARKETPLACE')
    }
  case EthereumNetwork.RINKEBY:
    if (collection.id.includes('testing') || collection.id.includes('testing3')) {
      const valuation = {
        collection,
        value: $ETH(0.1),
        value24Hr: $ETH(1),
        value1DReference: await getEthCollectionFloorPrice({ blockchain, collectionAddress: collection.address }),
      }

      logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>... OK`, valuation)

      return valuation
    }
    else if (collection.id.includes('testing2')) {
      const valuation = {
        collection,
        value: $ETH(1),
        value24Hr: $ETH(1),
        value1DReference: await getEthCollectionFloorPrice({ blockchain, collectionAddress: collection.address }),
      }

      logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>... OK`, valuation)

      return valuation
    }
    else {
      const err = failure('UNSUPPORTED_COLLECTION')
      logger.error(`Fetching valuation for Ethereum collection <${collectionAddress}>... ERR`, err)
      throw err
    }
  default:
    const err = failure('UNSUPPORTED_NETWORK')
    logger.error(`Fetching valuation for Ethereum collection <${collectionAddress}>... ERR`, err)
    throw err
  }
}
