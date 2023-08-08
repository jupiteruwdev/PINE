import axios from 'axios'
import BigNumber from 'bignumber.js'
import _ from 'lodash'
import Web3 from 'web3'
import appConf from '../../app.conf'
import { Blockchain, Valuation, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import { getEthCollectionMetadata } from '../collections'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'
import getTokenUSDPrice, { AvailableToken } from '../utils/getTokenUSDPrice'
import postRequest from '../utils/postRequest'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
  vendorIds?: Record<string, string>
}

const nftPerpSlugs: Record<string, string> = {
  '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d': 'boredapeyachtclub',
  '0x60e4d786628fea6478f785a6d7e704777c86a7c6': 'mutant-ape-yacht-club',
  '0x23581767a106ae21c074b2276d25e5c3e136a68b': 'proof-moonbirds',
  '0x1cb1a5e65610aeff2551a50f76a87a7d3fb649c6': 'cryptoadz-by-gremplin',
  '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e': 'doodles-official',
  '0xed5af388653567af2f388e6224dc7c4b3241c544': 'azuki',
  '0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b': 'clonex',
  '0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258': 'otherdeed',
  '0x60bb1e2aa1c9acafb4d34f71585d7e959f387769': 'artgobblers',
  '0xb7f7f6c52f2e2fdb1963eab30438024864c313f6': 'uni-punk',
  '0x5af0d9827e0c53e4799bb226655a1de152a425a5': 'uni-milady',
}

export default async function getEthNFTValuation({
  blockchain,
  collectionAddress,
  nftId,
  vendorIds,
}: Params): Promise<Valuation> {
  try {
    logger.info(`Fetching valuation for Ethereum NFT <${collectionAddress}/${nftId}>...`)

    if (blockchain.network !== 'ethereum' && blockchain.network !== 'polygon') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
    case Blockchain.Polygon.Network.MAIN:
      const valuation = await DataSource.fetch(
        useNFTPerp({ blockchain, collectionAddress, nftId, vendorIds }),
        useZyteOnePlanet({ blockchain, collectionAddress, nftId, vendorIds }),
        useMetaquants({ blockchain, collectionAddress, nftId, vendorIds }),
        useOpenSea({ blockchain, collectionAddress, nftId, vendorIds }),
        useAlchemy({ blockchain, collectionAddress, nftId, vendorIds }),
        useSpicyest({ blockchain, collectionAddress, nftId, vendorIds }),
        useGemXYZ({ blockchain, collectionAddress, nftId, vendorIds }),
      )

      return valuation
    case Blockchain.Ethereum.Network.RINKEBY:
    case Blockchain.Polygon.Network.MUMBAI:
    case Blockchain.Ethereum.Network.GOERLI:
      return Valuation.factory({
        value: Value.$ETH(0.1),
        value24Hr: Value.$ETH(0.1),
      })
    default:
      return Valuation.factory({
        value: Value.$ETH(0.001),
        value24Hr: Value.$ETH(0.001),
      })
    }
  }
  catch (err) {
    logger.error(`Fetching valuation for Ethereum NFT <${collectionAddress}/${nftId}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw fault('ERR_GET_ETH_NFT_VALUATION', undefined, err)
  }
}

function useNFTPerp({ blockchain, collectionAddress }: Params): DataSource<Valuation> {
  return async () => {
    try {
      logger.info(`...using NFTPerp to look up floor price for collection <${collectionAddress}>`)

      if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN) rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)

      const apiKey = appConf.nftPerpAPIKey ?? rethrow('Missing NFTPerp API Key')

      const slug = nftPerpSlugs[collectionAddress.toLowerCase()] ?? rethrow('Unsupported collection')
      const res = await getRequest('https://vdj0xvxta8.execute-api.eu-central-1.amazonaws.com/twap', {
        headers: {
          'x-api-key': apiKey,
        },
        params: {
          slug,
          hours: 1,
        },
      })

      const price = _.get(res, 'price') ?? rethrow('Unable to infer floor price')

      const valuation = Valuation.factory({
        value: Value.$ETH(Web3.utils.fromWei(price)),
        value24Hr: Value.$ETH(Web3.utils.fromWei(price)),
      })
      return valuation
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_VALUATION_USE_NFTPERP', undefined, err)
    }
  }
}

export function useSpicyest({ blockchain, collectionAddress, nftId }: Params): DataSource<Valuation> {
  return async () => {
    try {
      logger.info(`...using Spicyest to determine valuation for Ethereum NFT <${collectionAddress}/${nftId}>`)

      if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN) rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)

      const apiKey = appConf.spicyestAPIKey ?? rethrow('Missing Spicyest API key')

      const res = await getRequest(`https://api.spicyest.com/floor?address=${collectionAddress}`, {
        headers: {
          'X-API-KEY': apiKey,
        },
        useCache: false,
      })
      if (res?.currency !== 'ETH') rethrow('Wrong currency')
      const floorPrice = new BigNumber(_.get(res, 'price') || '0')

      const valuation = Valuation.factory({
        value: Value.$ETH(floorPrice),
        value24Hr: Value.$ETH(floorPrice),
      })

      return valuation
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_VALUATION_USE_SPICYEST', undefined, err)
    }
  }
}

export function useMetaquants({ blockchain, collectionAddress, nftId }: Params): DataSource<Valuation> {
  return async () => {
    try {
      logger.info(`...using Metaquants to determine valuation for Ethereum NFT <${collectionAddress}/${nftId}>`)

      if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN) rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)

      const apiKey = appConf.metaquantsAPIKey ?? rethrow('Missing Metaquants API key')

      const res = await getRequest(`https://api.metaquants.xyz/v1/realtime-floor-price/${collectionAddress.toLowerCase()}`, {
        headers: {
          'X-API-KEY': apiKey,
        },
        useCache: false,
      })

      if (!res?.body?.floor_price) rethrow('Collection not supported')
      const floorPrice = new BigNumber(res?.body?.floor_price ?? '0')

      const valuation = Valuation.factory({
        value: Value.$ETH(floorPrice),
        value24Hr: Value.$ETH(floorPrice),
      })

      return valuation
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_VALUATION_USE_METAQUANTS', undefined, err)
    }
  }
}

export function useZyteOnePlanet({ blockchain, collectionAddress, nftId, vendorIds }: Params): DataSource<Valuation> {
  return async () => {
    try {
      logger.info(`...using Zyte to determine valuation for Ethereum NFT <${collectionAddress}/${nftId}>`)

      if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN && blockchain.networkId !== Blockchain.Polygon.Network.MAIN) rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)

      const apiKey = appConf.zyteAPIKey ?? rethrow('Missing Zyte API key')
      if (!vendorIds) {
        const collectionMetadata = await getEthCollectionMetadata({ blockchain, collectionAddress, matchSubcollectionBy: { type: 'nftId', value: nftId } })
        vendorIds = collectionMetadata.vendorIds
      }
      const vendorId = vendorIds?.['zyte'] ?? rethrow('No vendor ID found')

      const { data } = await axios.post(
        'https://api.zyte.com/v1/extract',
        {
          url: vendorId,
          browserHtml: true,
        },
        {
          auth: { username: apiKey, password: '' },
        },
      )

      const regex = /<h4>Floor Price<\/h4>[\s\S]*<div class="TopInformation_desc__[^"]*?">(\d+(?:\.\d+)?)[\s\S]*<h4>Best Offer<\/h4>/
      const match = data?.browserHtml?.match(regex)[0]
      const regex2 = />(\d+(?:\.\d+)?)/
      const floorPrice = new BigNumber(match?.match(regex2)[0].slice(1) ?? '0')

      const valuation = Valuation.factory({
        value: Value.$ETH(floorPrice),
        value24Hr: Value.$ETH(floorPrice),
      })

      return valuation
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_VALUATION_USE_ZYTE_ONEPLANNET', undefined, err)
    }
  }
}

export function useAlchemy({ blockchain, collectionAddress, nftId }: Params): DataSource<Valuation> {
  return async () => {
    try {
      logger.info(`...using Alchemy to determine valuation for Ethereum NFT <${collectionAddress}/${nftId}>`)

      if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN) rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)

      const apiMainUrl = _.get(appConf.alchemyNFTAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API Url for blockchain <${JSON.stringify(blockchain)}>`)

      const res = await getRequest(`${apiMainUrl}/getFloorPrice?contractAddress=${collectionAddress}`, {
        useCache: false,
      })
      if (res?.openSea?.priceCurrency !== 'ETH') rethrow('Wrong currency')
      const floorPrice = new BigNumber(_.get(res, 'openSea.floorPrice', '0'))

      const valuation = Valuation.factory({
        value: Value.$ETH(floorPrice),
        value24Hr: Value.$ETH(floorPrice),
      })

      return valuation
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_VALUATION_USE_ALCHEMY', undefined, err)
    }
  }
}

export function useOpenSea({ blockchain, collectionAddress, nftId, vendorIds }: Params): DataSource<Valuation> {
  return async () => {
    try {
      logger.info(`...using OpenSea to determine valuation for Ethereum NFT <${collectionAddress}/${nftId}>`)

      if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN && blockchain.networkId !== Blockchain.Polygon.Network.MAIN) rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)

      const apiKey = appConf.openseaAPIKey ?? rethrow('Missing OpenSea API key')
      if (!vendorIds) {
        const collectionMetadata = await getEthCollectionMetadata({ blockchain, collectionAddress, matchSubcollectionBy: { type: 'nftId', value: nftId } })
        vendorIds = collectionMetadata.vendorIds
      }
      const vendorId = vendorIds?.['opensea'] ?? rethrow('No vendor ID found')

      const res = await getRequest(`https://api.opensea.io/api/v1/collection/${vendorId}/stats`, {
        headers: {
          'X-API-KEY': apiKey,
          'content-type': 'application/json',
          'Accept-Encoding': 'gzip,deflate,compress',
        },
      })
      const floorPrice = new BigNumber(_.get(res, 'stats.floor_price') ?? '0')
      const value24Hr = new BigNumber(_.get(res, 'stats.one_day_average_price') ?? '0')
      const value = floorPrice

      if (blockchain.networkId === Blockchain.Ethereum.Network.MAIN) {
        return Valuation.factory({
          value: Value.$ETH(value),
          value24Hr: Value.$ETH(value24Hr),
        })
      }
      else if (blockchain.networkId === Blockchain.Polygon.Network.MAIN) {
        const [ethPrice, maticPrice] = await Promise.all([
          getTokenUSDPrice(AvailableToken.ETH),
          getTokenUSDPrice(AvailableToken.MATIC),
        ])
        return Valuation.factory({
          value: Value.$ETH(value.times(ethPrice.amount).div(maticPrice.amount)),
          value24Hr: Value.$ETH(value24Hr.times(ethPrice.amount).div(maticPrice.amount)),
        })
      }
      else rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_VALUATION_USE_OPENSEA', undefined, err)
    }
  }
}

export function useGemXYZ({ blockchain, collectionAddress, nftId, vendorIds }: Params): DataSource<Valuation> {
  return async () => {
    try {
      logger.info(`...using GemXYZ to determine valuation for Ethereum NFT <${collectionAddress}/${nftId}>`)

      if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN) rethrow(`Unsupported Ethereum network <${blockchain.networkId}>`)

      const apiKey = appConf.gemxyzAPIKey ?? rethrow('Missing GemXYZ API key')
      if (!vendorIds) {
        const collectionMetadata = await getEthCollectionMetadata({ blockchain, collectionAddress, matchSubcollectionBy: { type: 'nftId', value: nftId } })
        vendorIds = collectionMetadata.vendorIds
      }
      const vendorId = vendorIds?.['gemxyz'] ?? rethrow('No vendor ID found')

      const reqData = {
        filters: {
          traits: JSON.parse(vendorId),
          traitsRange: {},
          address: collectionAddress,
          rankRange: {},
          price: {},
        },
        sort: {
          currentEthPrice: 'asc',
        },
        fields: {
          id: 1,
          name: 1,
          address: 1,
          collectionName: 1,
          collectionSymbol: 1,
          externalLink: 1,
          imageUrl: 1,
          smallImageUrl: 1,
          animationUrl: 1,
          standard: 1,
          market: 1,
          pendingTrxs: 1,
          currentBasePrice: 1,
          paymentToken: 1,
          marketUrl: 1,
          marketplace: 1,
          nftId: 1,
          priceInfo: 1,
          tokenReserves: 1,
          ethReserves: 1,
          sellOrders: 1,
          startingPrice: 1,
          rarityScore: 1,
        },
        offset: 0,
        limit: 30,
        markets: [],
        status: [
          'buy_now',
        ],
      }

      const res = await postRequest('https://gem-public-api-v2.herokuapp.com/assets', reqData, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        useCache: false,
      }).catch(err => rethrow(`Failed to fetch valuation from GemXYZ: ${err}`))

      const floorPrice = new BigNumber(_.get(res, 'data.0.currentBasePrice') ?? '0').div(new BigNumber(10).pow(new BigNumber(18)))

      const valuation = Valuation.factory({
        value: Value.$ETH(floorPrice),
        value24Hr: Value.$ETH(floorPrice),
      })

      return valuation
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_VALUATION_USE_GEMXYZ', undefined, err)
    }
  }
}
