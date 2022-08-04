import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Value } from '../../entities'
import composeDataSources, { DataSource } from '../../utils/composeDataSources'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import getRequest from '../utils/getRequest'

type Params = {
  blockchain: Blockchain<'ethereum'>
  collectionAddress: string
}

export default async function getEthCollectionFloorPrice({
  blockchain,
  collectionAddress,
}: Params): Promise<Value<'ETH'>> {
  logger.info(`Fetching floor price for collection <${collectionAddress}> on network <${blockchain.networkId}>...`)

  const dataSource = composeDataSources(
    useNFTBank({ blockchain, collectionAddress }),
  )

  try {
    const floorPrice = await dataSource.apply(undefined)
    logger.info(`Fetching floor price for collection <${collectionAddress}> on network <${blockchain.networkId}>... OK: ${floorPrice.amount.toFixed()}`)
    return floorPrice
  }
  catch (err) {
    logger.warn(`Fetching floor price for collection <${collectionAddress}> on network <${blockchain.networkId}>... WARN`)
    if (logger.isWarnEnabled()) console.warn(err)
    return Value.$ETH(NaN)
  }
}

export function useNFTBank({ blockchain, collectionAddress }: Params): DataSource<Value<'ETH'>> {
  return async () => {
    logger.info(`Using NFTBank to look up floor price for collection <${collectionAddress}>...`)

    if (blockchain.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const apiKey = appConf.nftbankAPIKey ?? rethrow('Missing NFTBank API key')

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const res = await getRequest(`https://api.nftbank.ai/estimates-v2/floor_price/${collectionAddress}`, {
        headers: {
          'X-API-Key': apiKey,
        },
        params: {
          'chain_id': 'ETHEREUM',
        },
      })

      const floorPrices = _.get(res, 'data.0.floor_price') ?? rethrow('Unable to infer floor price')
      const floorPrice = _.get(_.find(floorPrices, { 'currency_symbol': 'ETH' }), 'floor_price') ?? rethrow('Unable to infer floor price')

      return Value.$ETH(floorPrice)
    case Blockchain.Ethereum.Network.RINKEBY:
      return Value.$ETH(1)
    default:
      rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)
    }
  }
}
