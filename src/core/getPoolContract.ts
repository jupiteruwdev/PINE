import ERC721LendingABI from '../abis/ERC721Lending.json'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { getWeb3 } from '../utils/ethereum'

export default function getPoolContract(address: string, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
    case 'ethereum': {
      const web3 = getWeb3(blockchain.network_id)
      const contract = new web3.eth.Contract(ERC721LendingABI as any, address)
      return contract
    }
    default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
