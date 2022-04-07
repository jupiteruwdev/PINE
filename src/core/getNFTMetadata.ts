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

export default async function getNFTMetadata({ blockchain, collectionAddress, nftId }: Params): Promise<NFTMetadata> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
    const uri = await contract.methods.tokenURI(nftId).call()

    const metadata = await (() => {
      if (uri.indexOf('data:application/json;base64') !== -1) {
        return { data: JSON.parse(atob(uri.split(',')[1])) }
      }
      else if (uri.indexOf('data:application/json;utf8') !== -1) {
        const firstComma = uri.indexOf(',')
        return { data: JSON.parse(uri.slice(firstComma + 1, uri.length)) }
      }

      return getRequest(normalizeNFTImageUri(uri))
    })()

    return {
      imageUrl: normalizeNFTImageUri(metadata.image),
      name: metadata.name ?? `#${metadata.id ?? nftId}`,
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
