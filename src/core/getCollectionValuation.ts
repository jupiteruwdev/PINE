import SuperError from '@andrewscwei/super-error'
import axios from 'axios'
import _ from 'lodash'
import appConf from '../app.conf'
import Valuation from '../entities/Valuation'
import { $ETH, $USD } from '../entities/Value'
import { getEthValueUSD, getEthValueUSD24Hr } from '../utils/ethereum'
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
      ethValueUSD,
      ethValueUSD24Hr,
      { data: collectionData },
    ] = await Promise.all([
      getEthValueUSD(),
      getEthValueUSD24Hr(),
      axios.get(`https://api.opensea.io/api/v1/collection/${collectionId}/stats`, {
        headers: {
          'X-API-KEY': apiKey,
        },
      }),
    ])

    const valueEth24Hr: number = _.get(collectionData, 'stats.floor_price', NaN)
    const valueEth: number = valueEth24Hr > _.get(collectionData, 'stats.one_day_average_price', NaN) ? _.get(collectionData, 'stats.one_day_average_price', NaN) : valueEth24Hr
    const valuation: Valuation<'ETH'> = {
      'collection_id': collectionId,
      'updated_at': new Date(),
      'value_24hr': $ETH(valueEth24Hr),
      'value_usd_24hr': $USD(valueEth24Hr * ethValueUSD24Hr.amount),
      'value_usd': $USD(valueEth * ethValueUSD.amount),
      'value': $ETH(valueEth),
    }

    logger.info(`Fetching valuation for collection ID <${collectionId}> from venue <${venue}>... OK`, valuation)

    return valuation
  default:
    throw new SuperError(`Venue <${venue}> is not supported`, 'VENUE-NOT-SUPPORTED')
  }
}
