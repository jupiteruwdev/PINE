import { NFTCollectionModel } from '../../db'
import { Blockchain } from '../../entities'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'

type Params = {
  blockchain: Blockchain
  collectionNames: string[]
}

export default async function getCollectionAddressesByNames({
  blockchain,
  ...params
}: Params): Promise<string[]> {
  try {
    logger.info(`Fetching collection addresses using params <${JSON.stringify(params)}> on blockchain <${JSON.stringify(blockchain)}>...`)

    const dataSource = DataSource.compose(
      useDb({ blockchain, ...params })
    )

    const addresses = await dataSource.apply(undefined)
    return addresses
  }
  catch (err) {
    logger.warn(`Fetching collection addresses using params <${JSON.stringify(params)}> on blockchain <${JSON.stringify(blockchain)}>... WARN`)
    if (logger.isWarnEnabled() && !logger.silent) console.warn(err)

    return []
  }
}

function useDb({ blockchain, collectionNames }: Params): DataSource<string[]> {
  return async () => {
    logger.info('...using db to look up collections with collection names')

    if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const res = await NFTCollectionModel.find({
      displayName: {
        '$regex': collectionNames.join('|'),
        '$options': 'i',
      },
    }).exec()

    const addresses = res.reduce<string[]>((cur, collection) => {
      if (!collection.address) return cur
      cur.push(collection.address.toLowerCase())
      return cur
    }, [])

    return addresses
  }
}
