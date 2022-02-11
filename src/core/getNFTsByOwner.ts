import _ from 'lodash'
import ERC721EnumerableABI from '../abis/ERC721Enumerable.json'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import NFT from '../entities/NFT'
import { getEthWeb3 } from '../utils/ethereum'
import getNFTById from './getNFTById'
import getSupportedCollections from './getSupportedCollections'

type Params = {
  /**
   * If provided, the returned NFTs will only include those belonging to this collection address.
   */
  collectionAddress?: string

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
 * Fetches all supported NFTs owned by an address.
 *
 * @param params - See {@link Params}
 * @param blockchain - The blockchain of which the NFTs and owner reside.
 *
 * @returns An array of {@link NFT}.
 */
export default async function getNFTsByOwner({ ownerAddress, collectionAddress, populateMetadata = false }: Params, blockchain: Blockchain = EthBlockchain()): Promise<NFT[]> {
  const collections = getSupportedCollections({ [blockchain.network]: blockchain })

  if (collectionAddress) {
    const collection = collections.find(t => t.address === collectionAddress)

    if (!collection) return []

    switch (blockchain.network) {
    case 'ethereum': {
      const web3 = getEthWeb3(blockchain.networkId)
      const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
      const count = _.toNumber(await contract.methods.balanceOf(ownerAddress).call())
      const nftIds = await Promise.all([...Array(count)].map((val, idx) => contract.methods.tokenOfOwnerByIndex(ownerAddress, idx).call()))
      const nfts: NFT[] = []

      // TODO: Optimize this. Currently doing this in series to avoid 429 for some API calls.
      for (const nftId of nftIds) {
        const nft = await getNFTById({ id: nftId, collectionAddress, ownerAddress, populateMetadata }, blockchain)
        nfts.push(nft)
      }

      return nfts
    }
    default:
      throw Error(`Unsupported blockchain <${blockchain.network}>`)
    }
  }
  else {
    const nftsPerCollection = await Promise.all(collections.map(collection => getNFTsByOwner({ ownerAddress, collectionAddress: collection.address, populateMetadata }, blockchain)))

    return _.flatten(nftsPerCollection)
  }
}
