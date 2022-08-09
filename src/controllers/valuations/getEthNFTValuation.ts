import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, Valuation, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import { getEthCollectionMetadata } from '../collections'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'
import postRequest from '../utils/postRequest'

type Params = {
  blockchain: Blockchain<'ethereum'>
  collectionAddress: string
  nftId: string
}

export default async function getEthNFTValuation({
  blockchain,
  collectionAddress,
  nftId,
}: Params): Promise<Valuation> {
  try {
    logger.info(`Fetching valuation for Ethereum NFT <${collectionAddress}/${nftId}>...`)

    if (blockchain.network !== 'ethereum') rethrow (`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const dataSource = DataSource.compose(
        useOpenSea({ blockchain, collectionAddress, nftId }),
        useGemXYZ({ blockchain, collectionAddress, nftId }),
      )

      const valuation = await dataSource.apply(undefined)

      return valuation
    case Blockchain.Ethereum.Network.RINKEBY:
      return Valuation.factory({
        collection: Collection.factory({
          address: collectionAddress,
          blockchain,
        }),
        value: Value.$ETH(0.1),
        value24Hr: Value.$ETH(0.1),
        value1DReference: Value.$ETH(0.1),
      })
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Fetching valuation for Ethereum NFT <${collectionAddress}/${nftId}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw err
  }
}

export function useOpenSea({ blockchain, collectionAddress, nftId }: Params): DataSource<Valuation> {
  return async () => {
    logger.info(`...using OpenSea to determine valuation for Ethereum NFT <${collectionAddress}/${nftId}>`)

    if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN) rethrow (`Unsupported Ethereum network <${blockchain.networkId}>`)

    const apiKey = appConf.openseaAPIKey ?? rethrow('Missing OpenSea API key')
    const collectionMetadata = await getEthCollectionMetadata({ blockchain, collectionAddress, nftId })
    const vendorId = collectionMetadata.vendorIds?.['opensea'] ?? rethrow('No vendor ID found')

    const res = await getRequest(`https://api.opensea.io/api/v1/collection/${vendorId}/stats`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    })

    const floorPrice = new BigNumber(_.get(res, 'stats.floor_price'))
    const value24Hr = new BigNumber(_.get(res, 'stats.one_day_average_price'))
    const value = floorPrice.gt(value24Hr) ? value24Hr : floorPrice

    const valuation = Valuation.factory({
      collection: Collection.factory({
        address: collectionAddress,
        blockchain,
      }),
      value: Value.$ETH(value),
      value24Hr: Value.$ETH(value24Hr),
      value1DReference: Value.$ETH(0), // TODO: Remove this
    })

    return valuation
  }
}

export function useGemXYZ({ blockchain, collectionAddress, nftId }: Params): DataSource<Valuation> {
  return async () => {
    logger.info(`...using GemXYZ to determine valuation for Ethereum NFT <${collectionAddress}/${nftId}>`)

    if (blockchain.networkId !== Blockchain.Ethereum.Network.MAIN) rethrow (`Unsupported Ethereum network <${blockchain.networkId}>`)

    const apiKey = appConf.gemxyzAPIKey ?? rethrow('Missing GemXYZ API key')
    const collectionMetadata = await getEthCollectionMetadata({ blockchain, collectionAddress, nftId })
    const vendorId = collectionMetadata.vendorIds?.['gemxyz'] ?? rethrow('No vendor ID found')

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

    const res = postRequest('https://gem-public-api.herokuapp.com/assets', reqData, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
    })

    const floorPrice = new BigNumber(_.get(res, 'data.0.currentBasePrice')).div(new BigNumber(10).pow(new BigNumber(18)))

    const valuation = Valuation.factory({
      collection: Collection.factory({
        address: collectionAddress,
        blockchain,
      }),
      value: Value.$ETH(floorPrice),
      value24Hr: Value.$ETH(floorPrice),
      value1DReference: Value.$ETH(0), // TODO: Remove this
    })

    return valuation
  }
}
