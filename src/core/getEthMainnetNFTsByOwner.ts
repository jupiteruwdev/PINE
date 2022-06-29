import _ from 'lodash'
import appConf from '../app.conf'
import { findOneCollection } from '../db'
import { Blockchain, Collection, NFT, NFTMetadata } from '../entities'
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
  const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
  const collectionAddressFilter = _.isString(collectionOrCollectionAddress) ? collectionOrCollectionAddress : collectionOrCollectionAddress?.address

  const apiKey = appConf.moralisAPIKey
  if (!apiKey) throw failure('ERR_MISSING_API_KEY', 'Missing Moralis API key')

  const { result } = await getRequest(`https://deep-index.moralis.io/api/v2/${ownerAddress}/nft`, {
    headers: {
      'accept': 'application/json',
      'X-API-Key': apiKey,
    },
    params: {
      chain: 'eth',
      format: 'decimal',
    },
  })

  const nfts: (NFT | undefined)[] = await Promise.all(result.map(async (value: any): Promise<(NFT | undefined)> => {
    const collectionAddress = value.token_address
    if (!collectionAddress) return undefined

    const nftId = value.token_id
    if (!nftId) return undefined

    if (collectionAddressFilter && collectionAddressFilter.toLowerCase() !== collectionAddress.toLowerCase()) return undefined

    const collectionFromDB = await findOneCollection({ address: collectionAddress })
    const collection = collectionFromDB ?? {
      address: collectionAddress,
      blockchain: Blockchain.Ethereum(1),
      id: '',
    }

    let metadata: NFTMetadata | undefined

    if (populateMetadata) {
      try {
        try {
          const parsed = JSON.parse(value.metadata)
          const name = _.get(parsed, 'name')
          const image = _.get(parsed, 'image')

          if (!name || !image) throw 0

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
      collection,
      id: value.token_id,
      ownerAddress: value.owner_of,
      name: `#${value.token_id}`,
      ...metadata ?? {},
      isSupported: !!collectionFromDB,
    }
  }))

  return _.compact(nfts).sort((a, b) => a.isSupported ? -1 : 1)
}
