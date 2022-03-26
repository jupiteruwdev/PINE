import axios from 'axios'
import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../app.conf'
import Collection from '../entities/lib/Collection'
import Valuation from '../entities/lib/Valuation'
import { $ETH } from '../entities/lib/Value'
import failure from '../utils/failure'
import logger from '../utils/logger'
import web3 from 'web3'

type Params = {
  collection: Collection
}

export default async function getCollectionValuation({ collection }: Params): Promise<Valuation> {
  logger.info(`Fetching valuation for collection ID <${collection.id}>...`)
  const collectionId = collection.id
  const matches = collectionId.match(/(.*):(.*)/)
  const venue = matches?.[1]
  const id = matches?.[2]
  const apiKey = appConf.moralisAPIKey
  if (!apiKey) throw failure('MISSING_API_KEY')

  const { data: collectionValuation } = await axios.get(`https://deep-index.moralis.io/api/v2/nft/${collection.address}/lowestprice?chain=eth&marketplace=opensea&days=1`, {
    headers: {
      'accept': 'application/json',
      'X-API-Key': apiKey,
    },
  })

  // TODO: This is a hack
  if (collectionId === 'testing') {
    return {
      collection,
      value: $ETH(0.1),
      value24Hr: $ETH(1),
      value1DReference: $ETH(1),
    }
  }

  if (!collectionValuation) throw failure('UNSUPPORTED_COLLECTION')

  if (!collectionId) {
    return {
      collection,
      value: undefined,
      value24Hr: undefined,
      value1DReference: $ETH(web3.utils.fromWei(collectionValuation.price)),
    }
  }
  else {
    if (!venue || !id) throw failure('UNSUPPORTED_COLLECTION')

    switch (venue) {
    case 'opensea':
      try {
        const apiKey = appConf.openseaAPIKey

        if (!apiKey) throw failure('FETCH_OPENSEA_VALUATION_FAILURE')

        const { data: collectionData } = await axios.get(`https://api.opensea.io/api/v1/collection/${id}/stats`, {
          headers: {
            'X-API-KEY': apiKey,
          },
        })

        const floorPriceEth = new BigNumber(_.get(collectionData, 'stats.floor_price'))
        const average24HrPriceEth = new BigNumber(_.get(collectionData, 'stats.one_day_average_price'))
        const valueEth = floorPriceEth.gt(average24HrPriceEth) ? average24HrPriceEth : floorPriceEth
        const valuation: Valuation<'ETH'> = {
          collection,
          value: $ETH(valueEth),
          value24Hr: $ETH(average24HrPriceEth),
          value1DReference: $ETH(web3.utils.fromWei(collectionValuation.price)),
        }

        logger.info(`Fetching valuation for collection ID <${collectionId}>... OK`, valuation)

        return valuation
      }
      catch (err) {
        throw failure('FETCH_OPENSEA_VALUATION_FAILURE', err)
      }
    default:
      throw failure('UNSUPPORTED_MARKETPLACE')
    }
  }
}
