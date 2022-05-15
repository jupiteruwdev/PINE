import ERC721EnumerableABI from '../abis/ERC721Enumerable.json'
import Blockchain from '../entities/lib/Blockchain'
import { NFTMetadata } from '../entities/lib/NFT'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
import getRequest from '../utils/getRequest'
import normalizeNFTImageUri from '../utils/normalizeNFTImageUri'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
}

const cachedMetadata: { [key: string]: NFTMetadata } = {}
const cachedUri: { [key: string]: string } = {}

export default async function getNFTMetadata({ blockchain, collectionAddress, nftId }: Params): Promise<NFTMetadata> {
  if (cachedMetadata[JSON.stringify({ blockchain, collectionAddress, nftId })]) {
    return cachedMetadata[JSON.stringify({ blockchain, collectionAddress, nftId })]
  }
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
    const cachedUriName = JSON.stringify({ blockchain, collectionAddress })
    const uri = cachedUri[cachedUriName] ?? await contract.methods.tokenURI(nftId).call()
    if (!cachedUri[cachedUriName]) cachedUri[cachedUriName] = uri
    const metadata = await (() => {
      if (uri.indexOf('data:application/json;base64') !== -1) {
        return JSON.parse(atob(uri.split(',')[1]))
      }
      else if (uri.indexOf('data:application/json;utf8') !== -1) {
        const firstComma = uri.indexOf(',')
        return JSON.parse(uri.slice(firstComma + 1, uri.length))
      }

      return getRequest(normalizeNFTImageUri(uri))
    })()
    cachedMetadata[JSON.stringify({ blockchain, collectionAddress, nftId })] = {
      imageUrl: normalizeNFTImageUri(metadata.image),
      name: metadata.name ?? `#${metadata.id ?? nftId}`,
    }
    return cachedMetadata[JSON.stringify({ blockchain, collectionAddress, nftId })]
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
