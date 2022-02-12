import axios from 'axios'
import ERC721EnumerableABI from '../abis/ERC721Enumerable.json'
import { findOne } from '../db/collections'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { NFTMetadata } from '../entities/NFT'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'

type Params = {
  collectionAddress: string
  id: string
  populateMetadata?: boolean
}

/**
 * @todo Is this not some kind of hack??
 */
function normalizeUri(uri: string) {
  if (uri.slice(0, 4) !== 'ipfs') return uri
  return uri.replace('ipfs://', 'https://tempus.mypinata.cloud/ipfs/')
}

export default async function getNFTMetadata({ id, collectionAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<NFTMetadata> {
  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOne({ address: collectionAddress, blockchain })

    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
    const uri = await contract.methods.tokenURI(id).call()

    const { data: metadata } = await axios.get(normalizeUri(uri))

    return {
      imageUrl: normalizeUri(metadata.image),
      name: metadata.name ?? `#${metadata.id ?? id}`,
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
