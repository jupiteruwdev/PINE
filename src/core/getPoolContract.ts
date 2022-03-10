import ERC721LendingABI from '../abis/ERC721Lending.json'
import ERC721LendingABIV2 from '../abis/ERC721LendingV2.json'
import Blockchain from '../entities/lib/Blockchain'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolContract({ blockchain, poolAddress }: Params) {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const contractTest = new web3.eth.Contract(ERC721LendingABIV2 as any, poolAddress)
    try {
      await contractTest.methods._controlPlane().call()
      return contractTest
    }
    catch (e) {
      const contract = new web3.eth.Contract(ERC721LendingABI as any, poolAddress)
      return contract
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
