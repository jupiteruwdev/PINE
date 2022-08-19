import { NFTCollectionModel } from '../../db'
import { mapCollection } from '../../db/adapters'
import { Blockchain, Collection } from '../../entities'
import logger from '../../utils/logger'
import DataSource from '../utils/DataSource'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddresses?: string[],
  collectionNames?: string[]
}

export default async function getCollections(params: Params = {}): Promise<Collection[]> {
  logger.info(`Fetching collections with params <${JSON.stringify(params)}>...`)

  try {
    const dataSource = DataSource.compose(useDb(params))
    const collections = await dataSource.apply(undefined)

    logger.info(`Fetching collections with params <${JSON.stringify(params)}>... OK: Found ${collections.length} result(s)`)
    logger.debug(JSON.stringify(collections, undefined, 2))

    return collections
  }
  catch (err) {
    logger.error(`Fetching collections with params <${JSON.stringify(params)}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw err
  }
}

export function useDb({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddresses,
  collectionNames,
}: Params): DataSource<Collection[]> {
  return async () => {
    const networkTypes = Object.keys(blockchainFilter) as (keyof Blockchain.Filter)[]
    const blockchains = networkTypes.map(networkType => Blockchain.factory({ network: networkType, networkId: blockchainFilter[networkType] }))

    const res = await Promise.all(blockchains.map(async blockchain => {
      let filter

      filter = {
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
      }

      const docs = await NFTCollectionModel.find(filter).lean().exec()

      return docs.map(mapCollection)
    }))

    return res.reduce<Collection[]>((prev, curr) => [...prev, ...curr], [])
  }
}
