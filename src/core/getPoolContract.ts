import ERC721LendingABI from '../abis/ERC721Lending.json'
import ERC721LendingABIV2 from '../abis/ERC721LendingV2.json'
import Blockchain from '../entities/lib/Blockchain'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
import { Contract } from 'web3-eth-contract'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

type VersionedContract = Contract & { poolVersion?: number }

export default async function getPoolContract({ blockchain, poolAddress }: Params) : Promise<VersionedContract> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const contractTest: VersionedContract = new web3.eth.Contract(ERC721LendingABIV2 as any, poolAddress)
    try {
      await contractTest.methods._controlPlane().call()
      contractTest.poolVersion = 2
      return contractTest
    }
    catch (e) {
      const contract: VersionedContract = new web3.eth.Contract(ERC721LendingABI as any, poolAddress)
      contract.poolVersion = 1
      return contract
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
