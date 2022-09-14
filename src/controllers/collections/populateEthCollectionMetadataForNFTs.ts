import _ from 'lodash'
import { getCollections, getEthCollectionMetadata } from '.'
import { Blockchain, NFT } from '../../entities'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import { useDb } from './getEthCollectionMetadata'

type Params = {
  blockchain: Blockchain
  nfts: NFT[]
}

export default async function populateEthCollectionMetadataForNFTs({
  blockchain,
  nfts,
}: Params): Promise<NFT[]> {
  if (blockchain.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

  const uniqAddrs = _.uniq(nfts.map(t => t.collection.address.toLowerCase()))
  const addresInDb = (await getCollections({ blockchainFilter: { ethereum: blockchain.networkId }, collectionAddresses: uniqAddrs })).map(t => t.address.toLowerCase())

  const genericMetadataArray = await Promise.all(uniqAddrs.map(async addr => ({ [addr]: await getEthCollectionMetadata({ blockchain, collectionAddress: addr }) })))
  const genericMetadataDict = genericMetadataArray.reduce((prev, curr) => ({ ...prev, ...curr }), {})

  const mutableNFTs = await Promise.all(nfts.map(async (nft, idx) => {
    const addr = nft.collection.address.toLowerCase()
    const checkMatching = addresInDb.includes(addr)

    let metadata = {}

    if (checkMatching) {
      metadata = await DataSource.fetch(
        useDb({ blockchain, collectionAddress: addr, matchSubcollectionBy: { type: 'nftId', value: nft.id } }),
      ).catch(err => ({}))
    }

    if (_.isEmpty(metadata)) metadata = genericMetadataDict[addr]

    return {
      ...nft,
      collection: {
        ...nft.collection,
        ...metadata,
      },
    }
  }))

  return mutableNFTs
}
