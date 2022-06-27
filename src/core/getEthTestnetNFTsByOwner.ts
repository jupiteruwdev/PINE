import _ from 'lodash'
import appConf from '../app.conf'
import { findAllCollections, findOneCollection } from '../db'
import { Blockchain, Collection, NFT } from '../entities'
import getRequest from '../utils/getRequest'
import normalizeNFTImageUri from '../utils/normalizeNFTImageUri'

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
    const nftsRes = await getRequest(`${alchemyUrl}${appConf.alchemyAPIKey}/getNFTs?owner=${ownerAddress}&contractAddresses[]=${collection.address}`)
    const nfts: NFT[] = []

    if (nftsRes.totalCount) {
      _.forEach(nftsRes.ownedNfts, (nft: any) => {
        nfts.push({
          name: nft.metadata.name,
          imageUrl: normalizeNFTImageUri(nft.metadata.image),
          collection,
          id: nft.id.tokenId,
          ownerAddress,
        })
      })
    }
    return nfts
  }
  else {
    const collections = await findAllCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const nftsPerCollection = await Promise.all(collections.map(collection => getEthTestnetNFTsByOwner({ blockchain, ownerAddress, collectionOrCollectionAddress: collection, populateMetadata })))

    return _.flatten(nftsPerCollection)
  }
}
