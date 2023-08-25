import _ from 'lodash'
import appConf from '../../app.conf'
import { NFTCollectionModel } from '../../database'
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

type UseAlchemyParams = Params & {
  dbCollections: any[]
}

export default async function getEthCollectionFloorPrices({
  blockchain,
  collectionAddresses,
}: Params): Promise<Value<'ETH'>[]> {
  if (collectionAddresses.length === 0) return []

  logger.info(`Fetching floor prices for collections <${collectionAddresses}> on network <${blockchain.networkId}>...`)

  const dbCollections = await NFTCollectionModel.find({ networkId: blockchain.networkId, networkType: blockchain.network }).lean()

  try {
    const floorPrices = await DataSource.fetch(
      useAlchemy({ blockchain, collectionAddresses, dbCollections }),
    )

    logger.info(`Fetching floor prices for collections <${collectionAddresses}> on network <${blockchain.networkId}>... OK: ${floorPrices.map(t => t.amount.toFixed())}`)
    return floorPrices
  }
  catch (err) {
    logger.error(`Fetching floor prices for collections <${collectionAddresses}> on network <${blockchain.networkId}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)
    throw fault('ERR_FETCH_COLLECTION_FLOOR_PRICES', undefined, err)
  }
}

function useAlchemy({ blockchain, collectionAddresses, dbCollections }: UseAlchemyParams): DataSource<Value<'ETH'>[]> {
  return async () => {
    try {
      logger.info(`...using Alchemy to look up floor prices for collections <${collectionAddresses}>`)

      if (!Blockchain.isEVMChain(blockchain)) rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

      const apiMainUrl = _.get(appConf.alchemyNFTAPIUrl, blockchain.networkId) ?? rethrow(`Missing alchemy url for blockchain ${JSON.stringify(blockchain)}`)

      switch (blockchain.networkId) {
      case Blockchain.Ethereum.Network.MAIN:
      case Blockchain.Polygon.Network.MAIN:
      case Blockchain.Arbitrum.Network.MAINNET:
        const res: any[] = await Promise.all(_.chunk(collectionAddresses, 100).map(addresses => new Promise((resolve, reject) => {
          postRequest(`${apiMainUrl}/getContractMetadataBatch`, {
            contractAddresses: addresses,
          })
            .then(res => resolve(res))
            .catch(err => reject(err))
        })))

        let collections: any[] = []
        res.forEach(item => {
          collections = [...collections, ...item]
        })

        return collections.map((collection: any, index: number) => {
          const price = _.get(collection, 'contractMetadata.openSea.floorPrice')
          const dbCollection = dbCollections.find(dbC => _.get(dbC, 'address').toLowerCase() === collectionAddresses[index].toLowerCase())

          if (dbCollection && _.get(dbCollection, 'valuation.value.amount')) {
            return Value.$ETH(_.get(dbCollection, 'valuation.value.amount'))
          }

          return price === undefined ? Value.$ETH(NaN) : Value.$ETH(price)
        })
      case Blockchain.Ethereum.Network.GOERLI:
      case Blockchain.Polygon.Network.MUMBAI:
        return collectionAddresses.map(() => Value.$ETH(1))
      default:
        rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)
      }
    }
    catch (err) {
      throw fault('ERR_FETCH_COLLECTION_FLOOR_PRICES_USE_ALCHEMY', undefined, err)
    }
  }
}
