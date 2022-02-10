import ERC721EnumerableABI from '../abis/ERC721Enumerable.json'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import NFT from '../entities/NFT'
import { getEthWeb3 } from '../utils/ethereum'
import getNFTById from './getNFTById'
import getOwnerNFTCountByCollection from './getOwnerNFTCountByCollection'
import getSupportedCollections from './getSupportedCollections'

type Params = {
  ownerAddress: string
  collectionAddress: string
}

export default async function getOwnerNFTsByCollection({ ownerAddress, collectionAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<NFT[]> {
  const collections = getSupportedCollections([blockchain])
  const collection = collections.find(t => t.address === collectionAddress)

  if (!collection) return []

  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
    const count = await getOwnerNFTCountByCollection({ ownerAddress, collectionAddress }, blockchain)
    const nftIds = await Promise.all([...Array(count)].map((val, idx) => contract.methods.tokenOfOwnerByIndex(ownerAddress, idx).call()))
    const nfts = await Promise.all(nftIds.map(id => getNFTById({ id, collectionAddress, ownerAddress }, blockchain)))

    return nfts
  }
  default:
    throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
