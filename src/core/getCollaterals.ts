import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import getOwnerNFTsByCollection from './getOwnerNFTsByCollection'
import getSupportedCollections from './getSupportedCollections'

type Params = {
  ownerAddress: string
}

export default async function getCollaterals({ ownerAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  const collections = getSupportedCollections([blockchain])
  const nftsPerCollection = await Promise.all(collections.map(collection => getOwnerNFTsByCollection({ ownerAddress, collectionAddress: collection.address }, blockchain)))
  const nfts = _.flatten(nftsPerCollection)

  return nfts
}
