import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'

type Params = {
  contractAddress: string
  blockchain: Blockchain
}

export default async function getFloorPrice({ contractAddress, blockchain }: Params): Promise<Value> {
  try {
    logger.info(`Fetching floor price for contract <${contractAddress}> on network <${blockchain.networkId}>...`)
    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN: {
      const floorPrice = await DataSource.fetch(useAlchemy({ contractAddress, blockchain }))
      return floorPrice
    }
    case Blockchain.Polygon.Network.MAIN: {
      const floorPrice = await DataSource.fetch(useMetaquants({ contractAddress, blockchain }))
      return floorPrice
    }
    default:
      const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
      logger.error(`Fetching floor price for contract <${contractAddress}>... ERR:`, err)
      throw err
    }
  }
  catch (err) {
    logger.info(`Fetching floor price for contract <${contractAddress}> on network <${blockchain.networkId}>... ERR`)
    throw fault('ERR_FETCHING_CONTRACT_FLOOR_PRICE', undefined, err)
  }
}

function useAlchemy({ contractAddress, blockchain }: Params): DataSource<Value> {
  return async () => {
    logger.info(`...using alchemy to fetch floor price for collection <${contractAddress}> on network <${blockchain.networkId}>`)

    if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN) rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)

    const apiUrl = _.get(appConf.alchemyNFTAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API Url for blockchain <${JSON.stringify(blockchain)}>`)
    const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

    const res = await getRequest(`${apiUrl}${apiKey}/getFloorPrice`, {
      params: {
        contractAddress,
      },
    })

    if (res?.openSea?.priceCurrency !== 'ETH') rethrow('Wrong Currency')
    const floorPrice = new BigNumber(_.get(res, 'openSea.floorPrice', '0'))

    return Value.$ETH(floorPrice)
  }
}

function useMetaquants({ contractAddress, blockchain }: Params): DataSource<Value> {
  return async () => {
    logger.info(`...using metaquants to fetch floor price for collection <${contractAddress}> on network <${blockchain.networkId}>`)

    if (blockchain.networkId !== Blockchain.Polygon.Network.MAIN) rethrow(`Unsupported Polygon network <${blockchain.networkId}>`)

    const apiKey = appConf.metaquantsAPIKey ?? rethrow('Missing metaquants API key')
    const res = await getRequest(`https://api.metaquants.xyz/v1/realtime-floor-price/${contractAddress.toLowerCase()}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
      useCache: false,
    })
    if (res?.body?.floor_price > 100) rethrow('Wrong currency')
    const floorPrice = new BigNumber(res?.body?.floor_price ?? '0')

    return Value.$ETH(floorPrice)
  }
}
