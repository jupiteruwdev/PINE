import SuperError from '@andrewscwei/super-error'
import axios from 'axios'
import _ from 'lodash'
import appConf from '../app.conf'
import { $ETH } from '../entities/Currency'
import Valuation from '../entities/Valuation'
import { getEthPriceUSD, getEthPriceUSD24Hr } from '../utils/ethereum'

type Params = {
  venue: string
  collectionId: string
}

export default async function getCollectionValuation({ venue, collectionId }: Params): Promise<Valuation> {
  const ethPriceUSD = await getEthPriceUSD()
  const ethPriceUSD24Hr = await getEthPriceUSD24Hr()

  switch (venue) {
  case 'opensea':
    const apiKey = appConf.openseaAPIKey

    if (!apiKey) throw new SuperError(undefined, 'MISSING_API_KEY')

    const { data } = await axios.get(`https://api.opensea.io/api/v1/collection/${collectionId}/stats`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    })

    const valuation24Hr = _.get(data, 'stats.floor_price', NaN)
    const valuation = valuation24Hr > _.get(data, 'stats.one_day_average_price', NaN) ? _.get(data, 'stats.one_day_average_price', NaN) : valuation24Hr

    return {
      'collection_id': collectionId,
      'currency_usd_24hr': ethPriceUSD24Hr,
      'currency_usd': ethPriceUSD,
      'currency': $ETH(),
      'updated_at': new Date(),
      'valuation_24hr': valuation24Hr,
      'valuation_usd_24hr': valuation24Hr * ethPriceUSD24Hr,
      'valuation_usd': valuation * ethPriceUSD,
      valuation,
    }
  default: throw new SuperError(`Venue <${venue}> is not supported`, 'VENUE-NOT-SUPPORTED')
  }
}
