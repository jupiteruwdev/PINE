import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import postRequest from '../utils/postRequest'

type Params = {
  blockchain: Blockchain
  collectionAddresses: string[]
}

export default async function getEthCollectionFloorPrices({
  blockchain,
  collectionAddresses,
}: Params): Promise<Value<'ETH'>[]> {
  if (collectionAddresses.length === 0) return []

  logger.info(`Fetching floor prices for collections <${collectionAddresses}> on network <${blockchain.networkId}>...`)

  try {
    const floorPrices = await DataSource.fetch(
      useNFTBank({ blockchain, collectionAddresses }),
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

export function useNFTBank({ blockchain, collectionAddresses }: Params): DataSource<Value<'ETH'>[]> {
  return async () => {
    logger.info(`...using NFTBank to look up floor prices for collections <${collectionAddresses}>`)

    if (blockchain.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const apiKey = appConf.nftbankAPIKey ?? rethrow('Missing NFTBank API key')

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const { data: res } = await postRequest('https://api.nftbank.ai/estimates-v2/floor_price/bulk', {
        'chain_id': 'ETHEREUM',
        'asset_contracts': collectionAddresses,
      }, {
        headers: {
          'X-API-Key': apiKey,
        },
        timeout: 10000, // TODO: Why so slow
      })

      if (!_.isArray(res)) rethrow('Unexpected payload while looking up floor prices from NFTBank')

      // NFTBank result order is not guaranteed
      const floorPrices = collectionAddresses.map(address => {
        const entry = _.find(res, t => _.get(t, 'asset_contract')?.toLowerCase() === address.toLocaleLowerCase())
        const prices = _.get(entry, 'floor_price')
        const price = _.get(_.find(prices, { 'currency_symbol': 'ETH' }), 'floor_price')

        return price === undefined ? Value.$ETH(NaN) : Value.$ETH(price)
      })

      return floorPrices
    case Blockchain.Ethereum.Network.RINKEBY:
      return collectionAddresses.map(() => Value.$ETH(1))
    default:
      rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)
    }
  }
}
