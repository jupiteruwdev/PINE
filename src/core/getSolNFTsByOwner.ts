import { Metadata } from '@metaplex-foundation/mpl-token-metadata'
import { Connection, PublicKey } from '@solana/web3.js'
import _ from 'lodash'
import appConf from '../app.conf'
import { Blockchain, Collection, NFT, NFTMetadata, SolBlockchain } from '../entities'
import failure from '../utils/failure'
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
  populateMetadata?: boolean
}

async function getNFTDataFromMoralis(id: string, mintAddress: string, networkId: string): Promise<[NFT, string]> {
  const apiKey = appConf.moralisAPIKey
  if (!apiKey) throw failure('MISSING_API_KEY')

  const data = await getRequest(`https://solana-gateway.moralis.io/nft/${networkId}/${mintAddress}/metadata`, {
    headers: {
      'accept': 'application/json',
      'X-API-Key': apiKey,
    },
  })

  return [{
    collection: {
      address: data.metaplex.updateAuthority,
      blockchain: SolBlockchain(networkId),
      id: '', // TODO: Remove this
    },
    id,
    mintAddress,
  }, data.metaplex.metadataUri]
}

async function getNFTDataFromBlockchain(id: string, mintAddress: string, networkId: string): Promise<[NFT, string]> {
  const connection = new Connection('https://api.mainnet-beta.solana.com') // TODO: Handle different networks
  const mintPubkey = new PublicKey(mintAddress)
  const metadataPubKey = await Metadata.getPDA(mintPubkey)
  const { data } = await Metadata.load(connection, metadataPubKey)

  return [{
    collection: {
      address: data.updateAuthority,
      blockchain: SolBlockchain(networkId),
      id: '', // TODO: Remove this
    },
    id,
    mintAddress,
  }, data.data.uri]
}

/**
 * Fetches all Solana NFTs owned by an address on Mainnet.
 *
 * @param params - See {@link Params}
 *
 * @returns An array of {@link NFT}.
 */
export default async function getSolNFTsByOwner({
  blockchain,
  collectionOrCollectionAddress,
  ownerAddress,
  populateMetadata = false,
}: Params): Promise<NFT[]> {
  if (blockchain.network !== 'solana') throw failure('UNSUPPORTED_BLOCKCHAIN')

  const collectionAddressFilter = _.isString(collectionOrCollectionAddress) ? collectionOrCollectionAddress : collectionOrCollectionAddress?.address

  const apiKey = appConf.moralisAPIKey
  if (!apiKey) throw failure('MISSING_API_KEY')

  const result = await getRequest(`https://solana-gateway.moralis.io/account/${blockchain.networkId}/${ownerAddress}/nft`, {
    headers: {
      'accept': 'application/json',
      'X-API-Key': apiKey,
    },
  })

  const nfts: (NFT | undefined)[] = await Promise.all(result.map(async (value: any) => {
    const nftId = value.associatedTokenAddress
    if (!nftId) return undefined

    const mintAddress = value.mint
    if (!mintAddress) return undefined

    let nft: NFT | undefined
    let metadataUri: string | undefined

    try {
      [nft, metadataUri] = await getNFTDataFromMoralis(nftId, mintAddress, blockchain.networkId)
    }
    catch {
      try {
        [nft, metadataUri] = await getNFTDataFromBlockchain(nftId, mintAddress, blockchain.networkId)
      }
      catch {
        nft = undefined
        metadataUri = undefined
      }
    }

    if (!nft) return undefined

    if (collectionAddressFilter && collectionAddressFilter.toLowerCase() !== nft.collection.address.toLowerCase()) return undefined

    let metadata: NFTMetadata | undefined
    let collectionName: string | undefined

    if (populateMetadata) {
      if (!metadataUri) return undefined

      try {
        const res = await getRequest(metadataUri)
        const name = _.get(res, 'name')
        const image = _.get(res, 'image')

        if (!name || !image) throw 0

        collectionName = _.get(res, 'collection.name') ?? name

        metadata = {
          name,
          imageUrl: normalizeNFTImageUri(image),
        }
      }
      catch {
        metadata = undefined
      }
    }

    if (populateMetadata && !metadata) return undefined

    return {
      ...nft,
      collection: {
        ...nft.collection,
        name: collectionName,
      },
      ownerAddress,
      ...metadata ?? {},
    }
  }))

  return _.compact(nfts)
}
