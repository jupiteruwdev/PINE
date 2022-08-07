import { NFTCollectionModel } from '../../db'
import { mapCollection } from '../../db/adapters'
import { Blockchain, Collection } from '../../entities'
import composeDataSources, { DataSource } from '../../utils/composeDataSources'
import logger from '../../utils/logger'

type Params = {
  blockchainFilter?: Blockchain.Filter
}

export default async function getCollections({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
}: Params = {}): Promise<Collection[]> {
  logger.info(`Fetching collections with blockchain filter <${JSON.stringify(blockchainFilter)}>...`)

  try {
    const dataSource = composeDataSources(useDb({ blockchainFilter }))
    const collections = await dataSource.apply(undefined)

    logger.info(`Fetching collections with blockchain filter <${JSON.stringify(blockchainFilter)}>... OK: Found ${collections.length} result(s)`)
    logger.debug(JSON.stringify(collections, undefined, 2))

    return collections
  }
  catch (err) {
    logger.error(`Fetching collections with blockchain filter <${JSON.stringify(blockchainFilter)}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw err
  }
}

export function useDb({ blockchainFilter }: Required<Params>): DataSource<Collection[]> {
  return async () => {
    const networkTypes = Object.keys(blockchainFilter) as (keyof Blockchain.Filter)[]
    const blockchains = networkTypes.map(networkType => Blockchain.factory({ network: networkType, networkId: blockchainFilter[networkType] }) )

    const res = await Promise.all(blockchains.map(async blockchain => {
      const docs = await NFTCollectionModel.find({
        networkType: blockchain.network,
        networkId: blockchain.networkId,
      }).lean().exec()

      return docs.map(mapCollection)
    }))

    return res.reduce<Collection[]>((prev, curr) => [...prev, ...curr], [])
  }
}
