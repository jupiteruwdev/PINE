import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import { NFTCollectionModel } from '../../db'
import { mapCollection } from '../../db/adapters'
import { Blockchain, Collection, NFT } from '../../entities'
import fault from '../../utils/fault'
import { getEthNFTMetadata } from '../collaterals'

type Params = {
  address: string
  blockchain?: Blockchain
  nftId?: string
}

export default async function getCollection({
  address,
  blockchain = Blockchain.Ethereum(),
  nftId,
}: Params): Promise<Collection | undefined> {
  const res = await NFTCollectionModel.aggregate(getPipelineStages({ address, blockchain })).exec()
    .catch(err => { throw fault('ERR_DB_QUERY', undefined, err) })

  if (nftId === undefined) {
    const doc = res[0]
    if (!doc) return undefined
    return mapCollection(doc)
  }

  const filteredCollections = _.compact(await Promise.all(res.map(async doc => {
    if (!doc.matcher) return doc

    const nftMetadata = await getEthNFTMetadata({ blockchain, collectionAddress: address, nftId }).catch(err => { throw Error('NO') })
    const nft: Partial<NFT> = { id: nftId, ...nftMetadata }
    const regex = new RegExp(String(doc.matcher.regex))

    if (regex.test(_.get(nft, String(doc.matcher.fieldPath)))) return doc

    return undefined
  })))

  if (filteredCollections.length === 0) return undefined

  return mapCollection(filteredCollections[0])
}

function getPipelineStages({
  address,
  blockchain = Blockchain.Ethereum(),
}: Params): PipelineStage[] {
  return [{
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
}
