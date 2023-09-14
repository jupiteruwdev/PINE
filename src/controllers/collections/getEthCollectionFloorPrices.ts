import _ from 'lodash'
import { NFTCollectionModel } from '../../database'
import { Blockchain, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import { useReservoirCollections } from '../utils/useReservoirAPI'

type Params = {
  blockchain: Blockchain
  collectionAddresses: string[]
}

type UseReservoirParams = Params & {
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
      useReservoir({ blockchain, collectionAddresses, dbCollections }),
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

function useReservoir({ blockchain, collectionAddresses, dbCollections }: UseReservoirParams): DataSource<Value<'ETH'>[]> {
  return async () => {
    try {
      logger.info(`...using Reservoir to look up floor prices for collections <${collectionAddresses}>`)

      if (!Blockchain.isEVMChain(blockchain)) rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

      switch (blockchain.networkId) {
      case Blockchain.Ethereum.Network.MAIN:
      case Blockchain.Polygon.Network.MAIN:
      case Blockchain.Arbitrum.Network.MAINNET:
      case Blockchain.Avalanche.Network.MAINNET:
        const chunks = _.chunk(collectionAddresses, 50)
        let collections: any[] = []
        for (let i = 0; i < chunks.length; i++) {
          try {
            const collectionsInfo = await useReservoirCollections({ collectionAddresses: chunks[i], blockchain })
            collections = [...collections, _.get(collectionsInfo, 'collections', [])]
          }
          catch (err) {
            logger.error(`Fetching collections info for chunk ${i} ERR: `, err)
          }
        }

        return collections.map((collection: any, index: number) => {
          const price = _.get(collection, 'floorAsk.price.amount.native')
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
      throw fault('ERR_FETCH_COLLECTION_FLOOR_PRICES_USE_RESERVOIR', undefined, err)
    }
  }
}
