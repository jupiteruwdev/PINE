import _ from 'lodash'
import { findOne as findOneCollection } from '../db/collections'
import Blockchain from '../entities/lib/Blockchain'
import Collection from '../entities/lib/Collection'
import NFT from '../entities/lib/NFT'
import failure from '../utils/failure'
import axios from 'axios'
import appConf from '../app.conf'

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


function normalizeUri(uri: string) {
  if (uri.slice(0, 4) !== 'ipfs') return uri
  if (uri.indexOf('ipfs://ipfs/') !== -1) return uri.replace('ipfs://ipfs/', 'https://tempus.mypinata.cloud/ipfs/')
  return uri.replace('ipfs://', 'https://tempus.mypinata.cloud/ipfs/')
}

/**
 * Fetches all supported NFTs owned by an address.
 *
 * @param params - See {@link Params}
 * @param blockchain - The blockchain of which the NFTs and owner reside.
 *
 * @returns An array of {@link NFT}.
 */
export default async function getNFTsByOwner({ blockchain, collectionOrCollectionAddress, ownerAddress, populateMetadata }: Params): Promise<NFT[]> {
  switch (blockchain.network) {
  case 'ethereum': {
    const apiKey = appConf.moralisAPIKey

    if (!apiKey) throw failure('MISSING_API_KEY')

    const nftsRaw = await axios.get(`https://deep-index.moralis.io/api/v2/${ownerAddress}/nft?chain=eth&format=decimal`, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey,
      },
    })

    const nfts: NFT[] = (await Promise.all(nftsRaw.data.result.map(async (value:any) => {
      const collection = await findOneCollection({ address: value.token_address, blockchain })
      if (!collection) return undefined
      value.metadata = JSON.parse(value.metadata)
      return {
        collection: {
          address: value.token_address,
          blockchain,
          id: collection?.id ?? '',
          name: collection?.name ?? value.name,
        },
        id: value.token_id,
        ownerAddress: value.owner_of,
        imageUrl: normalizeUri(value.metadata?.image ?? ''),
        name: value.metadata?.name ?? (collection?.name ?? value.name) + ' #' + value.token_id,
      }
    }))).filter(e => e)

    if (collectionOrCollectionAddress) {
      const collection = _.isString(collectionOrCollectionAddress) ? await findOneCollection({ address: collectionOrCollectionAddress, blockchain }) : collectionOrCollectionAddress

      if (!collection) return []

      return nfts.filter(e => e.collection.address === collection.address)
    }

    return nfts
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }

}
