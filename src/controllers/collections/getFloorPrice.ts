import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { NFTCollectionModel } from '../../database'
import { Blockchain, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'
import { useOpenSea } from '../valuations/getEthNFTValuation'

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
      const floorPrice = await DataSource.fetch(useDb({ contractAddress, blockchain }), useOpenSeaValue({ contractAddress, blockchain }))
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

function useDb({ contractAddress, blockchain }: Params): DataSource<Value> {
  return async () => {
    try {
      logger.info(`...using db for floor price for collection <${contractAddress}> on network <${blockchain.networkId}>`)

      const res = await NFTCollectionModel.findOne({ address: {
        $regex: contractAddress,
        $options: 'i',
      }, networkId: blockchain.networkId, networkType: blockchain.network }).lean()

      return Value.$ETH(_.get(res, 'valuation.value.amount', 0))
    }
    catch (err) {
      throw fault('ERR_FETCHING_CONTRACT_FLOOR_PRICE_USE_DB', undefined, err)
    }
  }
}

function useOpenSeaValue({ contractAddress, blockchain }: Params): DataSource<Value> {
  return async () => {
    try {
      logger.info(`...using opensea for floor price for collection <${contractAddress}> on network <${blockchain.networkId}>`)

      const res = await DataSource.fetch(useOpenSea({ collectionAddress: contractAddress, blockchain, nftId: '0' }))

      if (!res.value) throw rethrow('Unsupported collection')

      return res.value
    }
    catch (err) {
      throw fault('ERR_FETCHING_CONTRACT_FLOOR_PRICE_USE_OPENSEA', undefined, err)
    }
  }
}

function useAlchemy({ contractAddress, blockchain }: Params): DataSource<Value> {
  return async () => {
    try {
      logger.info(`...using alchemy to fetch floor price for collection <${contractAddress}> on network <${blockchain.networkId}>`)

      if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN) rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)

      const apiMainUrl = _.get(appConf.alchemyNFTAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API Url for blockchain <${JSON.stringify(blockchain)}>`)

      const res = await getRequest(`${apiMainUrl}/getFloorPrice`, {
        params: {
          contractAddress,
        },
      })

      if (res?.openSea?.priceCurrency !== 'ETH') rethrow('Wrong Currency')
      const floorPrice = new BigNumber(_.get(res, 'openSea.floorPrice', '0'))

      return Value.$ETH(floorPrice)
    }
    catch (err) {
      throw fault('ERR_FETCHING_CONTRACT_FLOOR_PRICE_USE_ALCHEMY', undefined, err)
    }
  }
}
