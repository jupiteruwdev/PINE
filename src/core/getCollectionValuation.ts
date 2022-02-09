import SuperError from '@andrewscwei/super-error'
import axios from 'axios'
import _ from 'lodash'
import appConf from '../app.conf'
import { $ETH } from '../entities/Currency'
import Valuation from '../entities/Valuation'
import { getEthPriceUSD, getEthPriceUSD24Hr } from '../utils/ethereum'
import logger from '../utils/logger'

type Params = {
  venue: string
  collectionId: string
}

/**
 * @todo Use `Collection` instead of `collectionId`.
 */
export default async function getCollectionValuation({ venue, collectionId }: Params) {
  logger.info(`Fetching valuation for collection ID <${collectionId}> from venue <${venue}>...`)

  switch (venue) {
  case 'opensea':
    const apiKey = appConf.openseaAPIKey

    if (!apiKey) throw new SuperError(undefined, 'MISSING_API_KEY')

    const [
      ethPriceUSD,
      ethPriceUSD24Hr,
      { data: collectionData },
    ] = await Promise.all([
      getEthPriceUSD(),
      getEthPriceUSD24Hr(),
      axios.get(`https://api.opensea.io/api/v1/collection/${collectionId}/stats`, {
        headers: {
          'X-API-KEY': apiKey,
        },
      }),
    ])

    const value24Hr = _.get(collectionData, 'stats.floor_price', NaN)
    const value = value24Hr > _.get(collectionData, 'stats.one_day_average_price', NaN) ? _.get(collectionData, 'stats.one_day_average_price', NaN) : value24Hr
    const valuation: Valuation = {
      'collection_id': collectionId,
      'currency_price_usd_24hr': ethPriceUSD24Hr,
      'currency_price_usd': ethPriceUSD,
      'currency': $ETH(),
      'updated_at': new Date(),
      'value_24hr': value24Hr,
      'value_usd_24hr': value24Hr * ethPriceUSD24Hr,
      'value_usd': value * ethPriceUSD,
      value,
    }

    logger.info(`Fetching valuation for collection ID <${collectionId}> from venue <${venue}>... OK`, valuation)

    return valuation
  default:
    throw new SuperError(`Venue <${venue}> is not supported`, 'VENUE-NOT-SUPPORTED')
  }
}
