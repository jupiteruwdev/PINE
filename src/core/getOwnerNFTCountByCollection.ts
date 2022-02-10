import _ from 'lodash'
import ERC721EnumerableABI from '../abis/ERC721Enumerable.json'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { getEthWeb3 } from '../utils/ethereum'
import getSupportedCollections from './getSupportedCollections'

type Params = {
  ownerAddress: string
  collectionAddress: string
}

export default async function getOwnerNFTCountByCollection({ ownerAddress, collectionAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<number | undefined> {
  const collections = getSupportedCollections([blockchain])
  const collection = collections.find(t => t.address === collectionAddress)

  if (!collection) return undefined

  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collection.address)
    const count = await contract.methods.balanceOf(ownerAddress).call()

    return _.toNumber(count)
  }
  default:
    throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
