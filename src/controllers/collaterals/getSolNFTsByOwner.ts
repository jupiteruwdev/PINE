import { Metadata, PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata'
import { Connection, PublicKey } from '@solana/web3.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, NFT, NFTMetadata } from '../../entities'
import fault from '../../utils/fault'
import getRequest from '../utils/getRequest'
import normalizeIPFSUri from '../utils/normalizeIPFSUri'

type Params = {
  /**
   * The blockchain of which the NFTs and the owner reside.
   */
  blockchain: Blockchain

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
  if (!apiKey) throw fault('ERR_MISSING_API_KEY', 'Missing Moralis API key')

  const data = await getRequest(`https://solana-gateway.moralis.io/nft/${networkId}/${mintAddress}/metadata`, {
    headers: {
      'accept': 'application/json',
      'X-API-Key': apiKey,
    },
  })

  return [{
    collection: {
      address: data.metaplex.updateAuthority,
      blockchain: Blockchain.Solana(networkId),
    },
    id,
    mintAddress,
  }, data.metaplex.metadataUri]
}

async function getNFTDataFromBlockchain(id: string, mintAddress: string, networkId: string): Promise<[NFT, string]> {
  const connection = new Connection('https://api.mainnet-beta.solana.com') // TODO: Handle different networks
  const mintPubicKey = new PublicKey(mintAddress)
  const [metadataPubicKey] = await PublicKey.findProgramAddress([Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintPubicKey.toBuffer()], PROGRAM_ID)
  const metadata = await Metadata.fromAccountAddress(connection, metadataPubicKey)

  return [{
    collection: {
      address: metadata.updateAuthority.toString(),
      blockchain: Blockchain.Solana(networkId),
    },
    id,
    mintAddress,
  }, metadata.data.uri]
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
  ownerAddress,
  populateMetadata = false,
}: Params): Promise<NFT[]> {
  if (blockchain.network !== 'solana') throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

  const apiKey = appConf.moralisAPIKey
  if (!apiKey) throw fault('ERR_MISSING_API_KEY', 'Missing Moralis API key')

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
          imageUrl: normalizeIPFSUri(image),
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
