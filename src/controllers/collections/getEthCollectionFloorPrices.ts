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
      useAlchemy({ blockchain, collectionAddresses }),
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

function useAlchemy({ blockchain, collectionAddresses }: Params): DataSource<Value<'ETH'>[]> {
  return async () => {
    logger.info(`...using Alchemy to look up floor prices for collections <${collectionAddresses}>`)

    if (blockchain.network !== 'ethereum' && blockchain.network !== 'polygon') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const apiUrl = _.get(appConf.alchemyNFTAPIUrl, blockchain.networkId) ?? rethrow(`Missing alchemy url for blockchain ${JSON.stringify(blockchain)}`)

    const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing OpenSea API key')

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
    case Blockchain.Polygon.Network.MAIN:
      const res: any[] = await Promise.all(_.chunk(collectionAddresses, 100).map(addresses => new Promise((resolve, reject) => {
        postRequest(`${apiUrl}${apiKey}/getContractMetadataBatch`, {
          contractAddresses: addresses,
        })
          .then(res => resolve(res))
          .catch(err => reject(err))
      })))

      let collections: any[] = []
      res.forEach(item => {
        collections = [...collections, ...item]
      })

      return collections.map((collection: any) => {
        const price = _.get(collection, 'contractMetadata.openSea.floorPrice')

        return price === undefined ? Value.$ETH(NaN) : Value.$ETH(price)
      })
    case Blockchain.Ethereum.Network.GOERLI:
    case Blockchain.Polygon.Network.MUMBAI:
      return collectionAddresses.map(() => Value.$ETH(1))
    default:
      rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)
    }
  }
}
