import ERC721LendingABI from '../abis/ERC721Lending.json'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { getWeb3 } from '../utils/ethereum'

type Params = {
  poolAddress: string
}

export default function getPoolContract({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getWeb3(blockchain.network_id)
    const contract = new web3.eth.Contract(ERC721LendingABI as any, poolAddress)
    return contract
  }
  default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
