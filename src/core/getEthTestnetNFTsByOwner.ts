import axios from 'axios'
import _ from 'lodash'
import appConf from '../app.conf'
import { findAll as findAllCollections, findOne as findOneCollection } from '../db/collections'
import Blockchain from '../entities/lib/Blockchain'
import Collection from '../entities/lib/Collection'
import NFT from '../entities/lib/NFT'

type Params = {
  /**
   * The blockchain of which the NFTs and the owner reside.
   */
  blockchain: Blockchain

  /**
   * If provided, the returned NFTs will only include those belonging to this collection.
   */
  collectionOrCollectionAddress?: Collection | string

  /**
   * The address of the owner of the NFTs to look up.
   */
  ownerAddress: string

  /**
   * Specifies if NFT metadata should be included, defaults to false. The operation is faster if
   * metadata is not fetched.
   */
  populateMetadata: boolean
}

/**
 * Fetches all supported NFTs owned by an address on Ethereum Testnet.
 *
 * @param params - See {@link Params}
 *
 * @returns An array of {@link NFT}.
 */
export default async function getEthTestnetNFTsByOwner({ blockchain, collectionOrCollectionAddress, ownerAddress, populateMetadata }: Params): Promise<NFT[]> {
  if (collectionOrCollectionAddress) {
    const collection = _.isString(collectionOrCollectionAddress) ? await findOneCollection({ address: collectionOrCollectionAddress, blockchain }) : collectionOrCollectionAddress
    if (!collection) return []
    const alchemyUrl = _.get(appConf.alchemyAPIUrl, blockchain.networkId)
    const nftsRes = await axios.get(`${alchemyUrl}${appConf.alchemyAPIKey}/getNFTs?owner=${ownerAddress}&contractAddresses[]=${collection.address}`)
    const nfts: NFT[] = []

    if (nftsRes.data.totalCount) {
      _.forEach(nftsRes.data.ownedNfts, (nft: any) => {
        nfts.push({
          name: nft.metadata.name,
          imageUrl: nft.metadata.image,
          collection,
          id: nft.id.tokenId,
          ownerAddress,
        })
      })
    }
    return nfts
  }
  else {
    const collections = await findAllCollections({ blockchains: { [blockchain.network]: blockchain.networkId } })
    const nftsPerCollection = await Promise.all(collections.map(collection => getEthTestnetNFTsByOwner({ blockchain, ownerAddress, collectionOrCollectionAddress: collection, populateMetadata })))

    return _.flatten(nftsPerCollection)
  }
}
