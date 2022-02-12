import ERC721LendingABI from '../abis/ERC721Lending.json'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'

type Params = {
  poolAddress: string
}

export default function getPoolContract({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721LendingABI as any, poolAddress)
    return contract
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
