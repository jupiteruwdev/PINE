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

export default async function verifyPool({ blockchain, address, collectionAddress }: Params) {
  logger.info(`Verifying pool with address <${address}> on blockchain <${JSON.stringify(blockchain)}>`)

  try {
    switch (blockchain.network) {
    case 'ethereum':
      const web3 = getEthWeb3(blockchain.networkId)
      const contract = new web3.eth.Contract(ERC721LendingAPI as any, address)
      const onChainCollectionAddress = await contract.methods._supportedCollection().call()

      if (onChainCollectionAddress.toLowerCase() !== collectionAddress) {
        throw fault('ERR_VERIFING_POOL', undefined, 'ZOMBIE_POOL')
      }
      break
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }

    logger.info(`Verifying pool with address <${address}> on blockchain <${JSON.stringify(blockchain)}>... OK`)
  }
  catch (err) {
    logger.error(`Verifying pool with address <${address}> on blockchain <${JSON.stringify(blockchain)}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw fault('ERR_VERIFYING_POOL', undefined, err)
  }
}
