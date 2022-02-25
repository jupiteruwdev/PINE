import axios from 'axios'
import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../app.conf'
import { findOne as findOneCollection } from '../db/collections'
import Blockchain from '../entities/lib/Blockchain'
import Valuation from '../entities/lib/Valuation'
import { $ETH } from '../entities/lib/Value'
import failure from '../utils/failure'
import logger from '../utils/logger'

type Params = {
  collectionId: string
  blockchain: Blockchain
}

export default async function getCollectionValuation({ blockchain, collectionId }: Params): Promise<Valuation> {
  logger.info(`Fetching valuation for collection ID <${collectionId}>...`)

  const matches = collectionId.match(/(.*):(.*)/)
  const venue = matches?.[1]
  const id = matches?.[2]

  const collection = await findOneCollection({ id: collectionId, blockchain })

  if (!collection) throw failure('UNSUPPORTED_COLLECTION')

  // TODO: This is a hack
  if (collectionId === 'testing') {
    return {
      collection,
      updatedAt: new Date(),
      value: $ETH(0.028),
      value24Hr: $ETH(1),
    }
  }

  if (!venue || !id) throw failure('UNSUPPORTED_COLLECTION')

  switch (venue) {
  case 'opensea':
    try {
      const apiKey = appConf.openseaAPIKey

      if (!apiKey) throw failure('MISSING_API_KEY')

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
        updatedAt: new Date(),
        value: $ETH(valueEth),
        value24Hr: $ETH(average24HrPriceEth),
      }

      logger.info(`Fetching valuation for collection ID <${collectionId}>... OK`, valuation)

      return valuation
    }
    catch (err) {
      throw failure('FETCH_OPENSEA_VALUATION_FAILURE', err)
    }
  default:
    throw failure('UNSUPPORTED_VENUE')
  }
}
