import ERC721LendingAPI from '../../abis/ERC721Lending.json'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  blockchain: Blockchain
  address: string
  collectionAddress: string
}

export default async function getOnChainPoolExistance({ blockchain, address, collectionAddress }: Params): Promise<boolean> {
  logger.info(`Checking onChain pool with address <${address}> on blockchain <${JSON.stringify(blockchain)}>`)

  switch (blockchain.network) {
  case 'ethereum':
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721LendingAPI as any, address)
    try {
      const onChainCollectionAddress = await contract.methods._supportedCollection().call()
      if (onChainCollectionAddress.toLowerCase() === collectionAddress) return true
      return false
    }
    catch (err) {
      logger.error('Fetching supported collection address from on chain ... ERR:', err)
      return false
    }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
