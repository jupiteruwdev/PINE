import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'

type Params = {
  blockchain: Blockchain
  collectionAddresses: string[]
  userAddress: string
}

export default async function getEthCollectionFloorPrices({
  blockchain,
  collectionAddresses,
  userAddress,
}: Params): Promise<Value<'ETH'>[]> {
  if (collectionAddresses.length === 0) return []

  logger.info(`Fetching floor prices for collections <${collectionAddresses}> on network <${blockchain.networkId}>...`)

  try {
    const floorPrices = await DataSource.fetch(
      useOpenSea({ blockchain, collectionAddresses, userAddress }),
    )

    logger.info(`Fetching floor prices for collections <${collectionAddresses}> on network <${blockchain.networkId}>... OK: ${floorPrices.map(t => t.amount.toFixed())}`)
    return floorPrices
  }
  catch (err) {
    logger.error(`Fetching floor prices for collections <${collectionAddresses}> on network <${blockchain.networkId}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)
    throw fault('ERR_FETCH_FLOOR_PRICES', undefined, err)
  }
}

export function useOpenSea({ blockchain, collectionAddresses, userAddress }: Params): DataSource<Value<'ETH'>[]> {
  return async () => {
    logger.info(`...using OpenSea to look up floor prices for collection <${collectionAddresses}>`)

    if (blockchain.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const apiKey = appConf.openseaAPIKey ?? rethrow('Missing OpenSea API key')

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const res = await getRequest('https://api.opensea.io/api/v1/collections', {
        params: {
          'asset_owner': userAddress,
        },
        headers: {
          'X-API-KEY': apiKey,
        },
      })

      return collectionAddresses.map(address => {
        const entry = _.find(res, t => _.find(_.get(t, 'primary_asset_contracts'), c => _.get(c, 'address').toLowerCase() === address.toLowerCase()))
        const price = _.get(entry, 'stats.floor_price')

        return price === undefined ? Value.$ETH(NaN) : Value.$ETH(price)
      })
    case Blockchain.Ethereum.Network.GOERLI:
      return collectionAddresses.map(() => Value.$ETH(1))
    default:
      rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)
    }
  }
}
