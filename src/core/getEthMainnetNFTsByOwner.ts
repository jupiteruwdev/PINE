import _ from 'lodash'
import appConf from '../app.conf'
import { findOne as findOneCollection } from '../db/collections'
import { EthBlockchain } from '../entities/lib/Blockchain'
import Collection from '../entities/lib/Collection'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import NFT, { NFTMetadata } from '../entities/lib/NFT'
import failure from '../utils/failure'
import getRequest from '../utils/getRequest'
import normalizeNFTImageUri from '../utils/normalizeNFTImageUri'
import getNFTMetadata from './getNFTMetadata'

type Params = {
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
  populateMetadata?: boolean
}

/**
 * Fetches all Ethereum NFTs owned by an address on Mainnet.
 *
 * @param params - See {@link Params}
 *
 * @returns An array of {@link NFT}.
 */
export default async function getEthMainnetNFTsByOwner({
  collectionOrCollectionAddress,
  ownerAddress,
  populateMetadata = false,
}: Params): Promise<NFT[]> {
  const blockchain = EthBlockchain(EthereumNetwork.MAIN)
  const collectionAddressFilter = _.isString(collectionOrCollectionAddress) ? collectionOrCollectionAddress : collectionOrCollectionAddress?.address

  const apiKey = appConf.moralisAPIKey
  if (!apiKey) throw failure('MISSING_API_KEY')

  const { result } = await getRequest(`/${ownerAddress}/nft`, {
    host: 'https://deep-index.moralis.io/api/v2',
    headers: {
      'accept': 'application/json',
      'X-API-Key': apiKey,
    },
    params: {
      chain: 'eth',
      format: 'decimal',
    },
  })

  const nfts: (NFT | undefined)[] = await Promise.all(result.map(async (value: any) => {
    const collectionAddress = value.token_address
    if (!collectionAddress) return undefined

    const nftId = value.token_id
    if (!nftId) return undefined

    if (collectionAddressFilter && collectionAddressFilter.toLowerCase() !== collectionAddress.toLowerCase()) return undefined

    // TODO: Remove this when NFT Portfolio Viewer is implemented.
    if (!(await findOneCollection({ address: collectionAddress }))) return undefined

    let metadata: NFTMetadata | undefined

    if (populateMetadata) {
      try {
        try {
          const parsed = JSON.parse(value.metadata)
          const name = _.get(parsed, 'name')
          const image = _.get(parsed, 'image')

          if (!name || !image) throw Error()

          metadata = {
            name,
            imageUrl: normalizeNFTImageUri(image),
          }
        }
        // Fallback approach to populate metadata.
        catch {
          metadata = await getNFTMetadata({ blockchain, collectionAddress, nftId })
        }
      }
      catch {
        metadata = undefined
      }
    }

    if (populateMetadata && !metadata) return undefined

    return {
      collection: {
        address: collectionAddress,
        blockchain,
        id: '', // TODO: Remove this when we get rid of id in Collection
        name: value.name,
      },
      id: value.token_id,
      ownerAddress: value.owner_of,
      name: `#${value.token_id}`,
      ...metadata ?? {},
    }
  }))

  return _.compact(nfts)
}
