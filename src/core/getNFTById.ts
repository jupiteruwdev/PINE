import axios from 'axios'
import ERC721EnumerableABI from '../abis/ERC721Enumerable.json'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import NFT from '../entities/NFT'
import { getEthWeb3 } from '../utils/ethereum'
import getSupportedCollectionByAddress from './getSupportedCollection'

type Params = {
  collectionAddress: string
  id: string
  ownerAddress: string
  populateMetadata?: boolean
}

/**
 * @todo Is this not some kind of hack??
 */
function normalizeUri(uri: string) {
  if (uri.slice(0, 4) !== 'ipfs') return uri
  return uri.replace('ipfs://', 'https://tempus.mypinata.cloud/ipfs/')
}

export default async function getNFTById({ id, collectionAddress, ownerAddress, populateMetadata = false }: Params, blockchain: Blockchain = EthBlockchain()): Promise<NFT> {
  switch (blockchain.network) {
  case 'ethereum': {
    const collection = getSupportedCollectionByAddress({ collectionAddress }, blockchain)

    if (!collection) throw Error(`Unsupported collection with address <${collectionAddress}>`)

    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)

    if (populateMetadata) {
      const uri = await contract.methods.tokenURI(id).call()

      const { data: metadata } = await axios.get(normalizeUri(uri))

      return {
        collection,
        id,
        imageUrl: normalizeUri(metadata.image),
        name: metadata.name ?? `#${metadata.id ?? id}`,
        ownerAddress,
      }
    }
    else {
      return {
        collection,
        id,
        ownerAddress,
      }
    }
  }
  default:
    throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
