import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { findOneCollection } from '../../db'
import { Blockchain, Valuation, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getRequest from '../utils/getRequest'
import postRequest from '../utils/postRequest'
import getEthCollectionFloorPrice from './getEthCollectionFloorPrice'

type Params = {
  blockchain: Blockchain<'ethereum'>
  collectionAddress: string
  tokenId: string
}

export default async function getEthCollectionValuation({ blockchain, collectionAddress, tokenId }: Params): Promise<Valuation> {
  logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>...`)

  const collection = await findOneCollection({ blockchain, address: collectionAddress, nftId: tokenId })
  if (!collection) throw fault('ERR_UNSUPPORTED_COLLECTION')

  const venue = _.keys(collection.vendorIds)?.[0]
  const id = _.values(collection.vendorIds)?.[0]

  switch (blockchain.networkId) {
  case Blockchain.Ethereum.Network.MAIN:
    if (!venue || !id) throw fault('ERR_UNSUPPORTED_COLLECTION')

    switch (venue) {
    case 'opensea':
      try {
        const apiKey = appConf.openseaAPIKey
        if (!apiKey) throw fault('ERR_MISSING_API_KEY', 'Missing OpenSea API key')

        const [collectionData, collectionFloorPrice] = await Promise.all([
          getRequest(`https://api.opensea.io/api/v1/asset/${collectionAddress}/${tokenId}`, {
            headers: {
              'X-API-KEY': apiKey,
            },
          }),
          getRequest(`https://api.opensea.io/api/v1/collection/${id}/stats`, {
            headers: {
              'X-API-KEY': apiKey,
            },
          }),
        ])

        const collectionSlug = _.get(collectionData, 'collection.slug')
        if (_.isArray(id)) {
          if (id.length !== 0 || !id.includes(collectionSlug)) throw fault('ERR_UNSUPPORTED_COLLECTION')
        }
        else if (_.isString(id)) {
          if (id !== collectionSlug) throw fault('ERR_UNSUPPORTED_COLLECTION')
        }
        const floorPrice = new BigNumber(_.get(collectionFloorPrice, 'stats.floor_price'))
        const value24Hr = new BigNumber(_.get(collectionFloorPrice, 'stats.one_day_average_price'))
        const value = floorPrice.gt(value24Hr) ? value24Hr : floorPrice
        const valuation: Valuation<'ETH'> = {
          collection,
          value: Value.$ETH(value),
          value24Hr: Value.$ETH(value24Hr),
          value1DReference: Value.$ETH(0),
        }

        logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>... OK:`, valuation)

        return valuation
      }
      catch (err) {
        logger.error(`Fetching valuation for Ethereum collection <${collectionAddress}>... ERR:`, err)

        throw err
      }
    case 'gemxyz':
      try {
        const apiKey = appConf.gemxyzAPIKey
        if (!apiKey) throw fault('ERR_MISSING_API_KEY', 'Missing GEMXYZ key')

        const reqData = `{"filters":{"traits":${id},"traitsRange":{},"address":"${collectionAddress}","rankRange":{},"price":{}},"sort":{"currentEthPrice":"asc"},"fields":{"id":1,"name":1,"address":1,"collectionName":1,"collectionSymbol":1,"externalLink":1,"imageUrl":1,"smallImageUrl":1,"animationUrl":1,"standard":1,"market":1,"pendingTrxs":1,"currentBasePrice":1,"paymentToken":1,"marketUrl":1,"marketplace":1,"tokenId":1,"priceInfo":1,"tokenReserves":1,"ethReserves":1,"sellOrders":1,"startingPrice":1,"rarityScore":1},"offset":0,"limit":30,"markets":[],"status":["buy_now"]}`
        const [collectionDataRaw] = await Promise.all([
          postRequest('https://gem-public-api.herokuapp.com/assets', reqData, {
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': apiKey,
            },
          }),
        ])

        const collectionData = _.get(collectionDataRaw, 'data[0]')

        const floorPrice = new BigNumber(_.get(collectionData, 'currentBasePrice')).div(new BigNumber(10).pow(new BigNumber(18)))

        const valuation: Valuation<'ETH'> = {
          collection,
          value: Value.$ETH(floorPrice),
          value24Hr: Value.$ETH(floorPrice),
          value1DReference: Value.$ETH(0),
        }

        logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>... OK:`, valuation)

        return valuation
      }
      catch (err) {
        logger.error(`Fetching valuation for Ethereum collection <${collectionAddress}>... ERR:`, err)

        throw err
      }
    default:
      throw fault('ERR_UNSUPPORTED_MARKETPLACE')
    }
  case Blockchain.Ethereum.Network.RINKEBY:

    if (id === 'testing' || id === 'testing3') {
      const valuation = {
        collection,
        value: Value.$ETH(0.1),
        value24Hr: Value.$ETH(1),
        value1DReference: await getEthCollectionFloorPrice({ blockchain, collectionAddress: collection.address }),
      }

      logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>... OK:`, valuation)

      return valuation
    }
    else if (id === 'testing2') {
      const valuation = {
        collection,
        value: Value.$ETH(1),
        value24Hr: Value.$ETH(1),
        value1DReference: await getEthCollectionFloorPrice({ blockchain, collectionAddress: collection.address }),
      }

      logger.info(`Fetching valuation for Ethereum collection <${collectionAddress}>... OK:`, valuation)

      return valuation
    }
    else {
      const err = fault('ERR_UNSUPPORTED_COLLECTION')
      logger.error(`Fetching valuation for Ethereum collection <${collectionAddress}>... ERR:`, err)
      throw err
    }
  default:
    const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    logger.error(`Fetching valuation for Ethereum collection <${collectionAddress}>... ERR:`, err)
    throw err
  }
}
