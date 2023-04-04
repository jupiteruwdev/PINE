import ERC721LendingV2 from '../../abis/ERC721LendingV2.json' assert { type: 'json' }
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolEthLimit({ blockchain, poolAddress }: Params) {
  switch (blockchain.network) {
  case 'ethereum':
  case 'polygon':
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721LendingV2 as any, poolAddress)

    try {
      const ethLimit = await contract.methods._maxLoanLimit().call()
      return ethLimit
    }
    catch (err) {
      return null
    }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
