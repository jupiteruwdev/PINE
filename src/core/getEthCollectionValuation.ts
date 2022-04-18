import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../app.conf'
import { findOne as findOneCollection } from '../db/collections'
import Blockchain from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import Valuation from '../entities/lib/Valuation'
import { $ETH } from '../entities/lib/Value'
import failure from '../utils/failure'
import getRequest from '../utils/getRequest'
import logger from '../utils/logger'

type Params = {
  blockchain: Blockchain<'ethereum'>
  collectionAddress: string
}

export default async function getEthCollectionValuation({ blockchain, collectionAddress }: Params): Promise<Valuation> {
  logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>...`)

  const collection = await findOneCollection({ blockchain, address: collectionAddress })
  if (!collection) throw failure('UNSUPPORTED_COLLECTION')

  const collectionId = collection.id

  switch (blockchain.networkId) {
    case EthereumNetwork.MAIN:
      const matches = collectionId.match(/(.*):(.*)/)
      const venue = matches?.[1]
      const id = matches?.[2]
      const apiKey = appConf.nftbankAPIKey
      if (!apiKey) throw failure('MISSING_API_KEY')

      const { data: [collectionValuation] } = await getRequest(`https://api.nftbank.ai/estimates-v2/floor_price/${collection.address}`, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': apiKey,
        },
        params: {
          'chain_id': 'ETHEREUM',
        },
      })

      if (!collectionValuation) throw failure('UNSUPPORTED_COLLECTION')

      const floorPriceEthRef = collectionValuation.floor_price.filter((e: any) => e.currency_symbol === 'ETH')[0].floor_price

      if (!collectionId) {
        return {
          collection,
          value: undefined,
          value24Hr: undefined,
          value1DReference: $ETH(floorPriceEthRef),
        }
      }
      else {
        if (!venue || !id) throw failure('UNSUPPORTED_COLLECTION')

        switch (venue) {
        case 'opensea':
          try {
            const apiKey = appConf.openseaAPIKey

            if (!apiKey) throw failure('FETCH_OPENSEA_VALUATION_FAILURE')

            const collectionData = await getRequest(`https://api.opensea.io/api/v1/collection/${id}/stats`, {
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
              value1DReference: $ETH(floorPriceEthRef),
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
    case EthereumNetwork.RINKEBY:
      if (collectionId === 'testing') {
        return {
          collection,
          value: $ETH(0.1),
          value24Hr: $ETH(1),
          value1DReference: $ETH(1),
        }
      }
    default:
      throw failure('UNSUPPORTED_NETWORK')
  }
}
