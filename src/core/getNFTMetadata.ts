import axios from 'axios'
import ERC721EnumerableABI from '../abis/ERC721Enumerable.json'
import { findOne } from '../db/collections'
import Blockchain from '../entities/lib/Blockchain'
import { NFTMetadata } from '../entities/lib/NFT'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
}

/**
 * @todo Is this not some kind of hack??
 */
function normalizeUri(uri: string) {
  if (uri.slice(0, 4) !== 'ipfs') return uri
  return uri.replace('ipfs://', 'https://tempus.mypinata.cloud/ipfs/')
}

export default async function getNFTMetadata({ blockchain, collectionAddress, nftId }: Params): Promise<NFTMetadata> {
  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOne({ address: collectionAddress, blockchain })

    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
    const uri = await contract.methods.tokenURI(nftId).call()

    const { data: metadata } = await (() => {
      if (uri.slice(0, 4) === 'data') {
        return {data: JSON.parse(atob(uri.split(',')[1]))}
      }
      return axios.get(normalizeUri(uri))
    })()

    return {
      imageUrl: normalizeUri(metadata.image),
      name: metadata.name ?? `#${metadata.id ?? nftId}`,
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
