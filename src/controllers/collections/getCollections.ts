import { NFTCollectionModel } from '../../db'
import { Blockchain, Collection } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { mapCollection } from '../adapters'
import DataSource from '../utils/DataSource'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddresses?: string[]
  collectionNames?: string[]
  verifiedOnly?: boolean
}

export default async function getCollections(params: Params = {}): Promise<Collection[]> {
  logger.info(`Fetching collections with params <${JSON.stringify(params)}>...`)

  try {
    const collections = await DataSource.fetch(
      useDb(params),
    )

    logger.info(`Fetching collections with params <${JSON.stringify(params)}>... OK: Found ${collections.length} result(s)`)
    logger.debug(JSON.stringify(collections, undefined, 2))

    return collections
  }
  catch (err) {
    logger.error(`Fetching collections with params <${JSON.stringify(params)}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw fault('ERR_GET_COLLECTIONS', undefined, err)
  }
}

export function useDb({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
    polygon: Blockchain.Polygon.Network.MAIN,
  },
  collectionAddresses,
  collectionNames,
  verifiedOnly = true,
}: Params): DataSource<Collection[]> {
  return async () => {
    try {
      const blockchains = Blockchain.fromFilter(blockchainFilter)

      const res = await Promise.all(blockchains.map(async blockchain => {
        const filter = {
          networkType: blockchain.network,
          networkId: blockchain.networkId,
          ...!collectionAddresses ? {} : {
            address: {
              '$regex': collectionAddresses.join('|'),
              '$options': 'i',
            },
          },
          ...!collectionNames ? {} : {
            displayName: {
              '$regex': collectionNames.join('|'),
              '$options': 'i',
            },
          },
          ...!verifiedOnly ? {} : {
            verified: true,
          },
        }

        const docs = await NFTCollectionModel.find(filter).lean().exec()

        return docs.map(mapCollection)
      }))

      return res.reduce<Collection[]>((prev, curr) => [...prev, ...curr], [])
    }
    catch (err) {
      throw fault('ERR_GET_COLLECTIONS_USE_DB', undefined, err)
    }
  }
}
