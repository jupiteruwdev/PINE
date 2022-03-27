import _ from 'lodash'
import { findOne as findOneCollection } from '../db/collections'
import Blockchain from '../entities/lib/Blockchain'
import Collection from '../entities/lib/Collection'
import NFT from '../entities/lib/NFT'
import failure from '../utils/failure'
import axios from 'axios'
import appConf from '../app.conf'
import getNFTMetadata from './getNFTMetadata'
import { Connection, PublicKey } from '@solana/web3.js'
import { Metadata } from '@metaplex-foundation/mpl-token-metadata'

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
  index: number
}


function normalizeUri(uri: string) {
  if (uri.slice(0, 4) !== 'ipfs') return uri
  if (uri.indexOf('ipfs://ipfs/') !== -1) return uri.replace('ipfs://ipfs/', 'https://tempus.mypinata.cloud/ipfs/')
  return uri.replace('ipfs://', 'https://tempus.mypinata.cloud/ipfs/')
}

function delay(t: number, val?:any) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(val)
    }, t)
  })
}

/**
 * Fetches all supported NFTs owned by an address.
 *
 * @param params - See {@link Params}
 * @param blockchain - The blockchain of which the NFTs and owner reside.
 *
 * @returns An array of {@link NFT}.
 */
export default async function getNFTsByOwner({ blockchain, collectionOrCollectionAddress, ownerAddress, populateMetadata, index }: Params): Promise<NFT[]> {
  switch (blockchain.network) {
  case 'ethereum': {
    const apiKey = appConf.moralisAPIKey

    if (!apiKey) throw failure('MISSING_API_KEY')

    await delay(100 * index)

    const nftsRaw = await axios.get(`https://deep-index.moralis.io/api/v2/${ownerAddress}/nft?chain=eth&format=decimal`, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey,
      },
    })

    const nfts: NFT[] = (await Promise.all(nftsRaw.data.result.map(async (value:any) => {
      const collection = await findOneCollection({ address: value.token_address, blockchain })

      value.metadata = JSON.parse(value.metadata)
      if (!value.metadata?.image) {
        value.metadata = await getNFTMetadata({ blockchain, collectionAddress: value.token_address, nftId: value.token_id })
      }
      return {
        collection: {
          address: value.token_address,
          blockchain,
          id: collection?.id ?? '',
          name: collection?.name ?? value.name,
        },
        id: value.token_id,
        ownerAddress: value.owner_of,
        imageUrl: normalizeUri(value.metadata?.image ?? value.metadata.imageUrl ?? ''),
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
  case 'solana':{
    const apiKey = appConf.moralisAPIKey

    if (!apiKey) throw failure('MISSING_API_KEY')

    const { data: nftsRaw } = await axios.get(`https://solana-gateway.moralis.io/account/${blockchain.networkId}/${ownerAddress}/nft`, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey,
      },
    })

    return (await Promise.all(nftsRaw.map(async (value:any) => {
      try {
        const { data: nftMeta } = await axios.get(`https://solana-gateway.moralis.io/nft/${blockchain.networkId}/${value.mint}/metadata`, {
          headers: {
            'accept': 'application/json',
            'X-API-Key': apiKey,
          },
        })
        const collection = await findOneCollection({ address: nftMeta.metaplex.updateAuthority, blockchain })
        const { data } = await axios.get(nftMeta.metaplex.metadataUri)
        return {
          collection: {
            address: nftMeta.metaplex.updateAuthority,
            blockchain,
            id: collection?.id ?? '',
            name: collection?.name ?? nftMeta.symbol,
          },
          id: value.associatedTokenAddress,
          ownerAddress,
          imageUrl: normalizeUri(data.image ?? ''),
          name: nftMeta.name ?? (collection?.name ?? value.name) + ' #' + value.token_id,
        }
      }
      catch {
        const connection = new Connection('https://api.mainnet-beta.solana.com')
        const mintPubkey = new PublicKey(value.mint)
        const tokenmetaPubkey = await Metadata.getPDA(mintPubkey)
        const tokenmeta = await Metadata.load(connection, tokenmetaPubkey)
        const collection = await findOneCollection({ address: tokenmeta.data.updateAuthority, blockchain })
        const { data } = await axios.get(tokenmeta.data.data.uri)
        return {
          collection: {
            address: tokenmeta.data.updateAuthority,
            blockchain,
            id: collection?.id ?? '',
            name: collection?.name ?? tokenmeta.data.data.symbol,
          },
          id: value.associatedTokenAddress,
          ownerAddress,
          imageUrl: normalizeUri(data.image ?? ''),
          name: tokenmeta.data.data.name ?? (collection?.name ?? value.name) + ' #' + value.token_id,
        }
      }
    }))).filter(e => e)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }

}
