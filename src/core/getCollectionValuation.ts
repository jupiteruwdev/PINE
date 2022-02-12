import axios from 'axios'
import _ from 'lodash'
import appConf from '../app.conf'
import Valuation from '../entities/Valuation'
import { $ETH } from '../entities/Value'
import failure from '../utils/failure'
import logger from '../utils/logger'

type Params = {
  collectionId: string
}

export default async function getCollectionValuation({ collectionId }: Params) {
  logger.info(`Fetching valuation for collection ID <${collectionId}>...`)

  const matches = collectionId.match(/(.*):(.*)/)
  const venue = matches?.[1]
  const id = matches?.[2]

  if (!venue || !id) throw failure('INVALID_COLLECTION_ID')

  switch (venue) {
  case 'opensea':
    const apiKey = appConf.openseaAPIKey

    if (!apiKey) throw failure('MISSING_API_KEY')

    const { data: collectionData } = await axios.get(`https://api.opensea.io/api/v1/collection/${id}/stats`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    })

    const valueEth24Hr: number = _.get(collectionData, 'stats.floor_price', NaN)
    const valueEth: number = valueEth24Hr > _.get(collectionData, 'stats.one_day_average_price', NaN) ? _.get(collectionData, 'stats.one_day_average_price', NaN) : valueEth24Hr
    const valuation: Valuation<'ETH'> = {
      collectionId,
      updatedAt: new Date(),
      value: $ETH(valueEth),
      value24Hr: $ETH(valueEth24Hr),
    }

    logger.info(`Fetching valuation for collection ID <${collectionId}>... OK`, valuation)

    return valuation
  default:
    throw failure('UNSUPPORTED_VENU')
  }
}
