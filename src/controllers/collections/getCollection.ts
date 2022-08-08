import _ from 'lodash'
import { NFTCollectionModel } from '../../db'
import { mapCollection } from '../../db/adapters'
import { Blockchain, Collection, NFT } from '../../entities'
import composeDataSources, { DataSource } from '../../utils/composeDataSources'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import { getEthNFTMetadata } from '../collaterals'

type Params = {
  address: string
  blockchain: Blockchain
  nftId?: string
}

export default async function getCollection({
  address,
  blockchain,
  nftId,
}: Params): Promise<Collection | undefined> {
  logger.info(`Fetching collection for address <${address}> on blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    const dataSource = composeDataSources(
      useDb({ address, blockchain, nftId }),
    )

    const collection = await dataSource.apply(undefined)

    return collection
  }
  catch (err) {
    logger.warn(`Fetching collection for address <${address}> on blockchain <${JSON.stringify(blockchain)}>... WARN`)
    if (logger.isWarnEnabled() && !logger.silent) console.warn(err)

    return undefined
  }
}

export function useDb({ address, blockchain, nftId }: Params): DataSource<Collection> {
  return async () => {
    const pipeline = [{
      $addFields: {
        '_address': {
          $toLower: '$address',
        },
      },
    }, {
      $match: {
        'networkType': blockchain.network,
        'networkId': parseInt(blockchain.networkId, 10),
        ...address === undefined ? {} : { _address: address.toLowerCase() },
      },
    }]

    const res = await NFTCollectionModel.aggregate(pipeline).exec()
      .catch(err => rethrow(fault('ERR_DB_QUERY', undefined, err)))

    if (nftId === undefined) {
      if (res.length > 1) rethrow('More than 1 collection found but no matcher was provided')
      return mapCollection(res[0])
    }

    const filteredCollections = _.compact(await Promise.all(res.map(async doc => {
      if (!doc.matcher) return doc

      const nftMetadata = await getEthNFTMetadata({ blockchain, collectionAddress: address, nftId })
      const nft: Partial<NFT> = { id: nftId, ...nftMetadata }
      const regex = new RegExp(String(doc.matcher.regex))

      if (regex.test(_.get(nft, String(doc.matcher.fieldPath)))) return doc

      return undefined
    })))

    if (filteredCollections.length === 0) rethrow('No collection found')

    return mapCollection(filteredCollections[0])
  }
}
