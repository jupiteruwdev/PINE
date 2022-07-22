import _ from 'lodash'
import { NFTCollectionModel } from '../../db'
import { mapCollection } from '../../db/adapters'
import { Blockchain, Collection, NFT, NFTMetadata } from '../../entities'
import { getNFTMetadata } from '../collaterals'

type Params = {
  address: string
  blockchain?: Blockchain
  nftId?: string
}

export default async function findOneCollection({
  address,
  blockchain = Blockchain.Ethereum(),
  nftId,
}: Params): Promise<Collection | undefined> {
  const query = {
    networkType: blockchain.network,
    networkId: blockchain.networkId,
    ...address === undefined ? {} : { address },
  }

  const docs = await NFTCollectionModel.find(query).lean().exec()

  if (nftId === undefined) {
    const doc = docs[0]
    if (!doc) return undefined
    return mapCollection(doc)
  }

  const filteredCollections = _.compact(await Promise.all(docs.map(async doc => {
    if (!doc.matcher) return doc

    const nftMetadata: NFTMetadata = await getNFTMetadata({ blockchain, collectionAddress: address, nftId })
    const nft: Partial<NFT> = { id: nftId, ...nftMetadata }
    const regex = new RegExp(String(doc.matcher.regex))

    if (regex.test(_.get(nft, String(doc.matcher.fieldPath)))) return doc

    return undefined
  })))

  if (filteredCollections.length === 0) return undefined

  return mapCollection(filteredCollections[0])
}
